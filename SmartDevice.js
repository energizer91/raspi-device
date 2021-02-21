const wifi = require('Wifi');
const WebSocket = require('ws');
const messageQueue = require('messageQueue');
const connectionManager = require("connectionManager");
const Storage = require("Storage");

function SmartDevice(vid, pid, params) {
  this.params = Object.assign({
    pid: pid || '0000',
    vid: vid || '0000',
    sno: '00000000',
    ws: {
      port: '8080'
    },
    reconnect: true,
    denyReset: false,
    reconnectInterval: 5000,
    connectionAttempts: 10
  }, params);

  const config = Storage.read(this.params.sno + ".config");

  if (!config) {
    this.config = params.config || {};
  } else {
    this.config = Object.assign({}, JSON.parse(config), params.config);
  }

  this.name = this.params.name || this.params.vid + '/' + this.params.pid + '/' + this.params.sno;
  this.hotspotName = "SmartDevice_" + this.params.pid + "_" + this.params.vid;
  this.ws = null;
  this.data = null;
  this.connection = null;
  this.connected = false;
  this.registered = false;

  return this;
}

SmartDevice.prototype.resetWatchdog = function() {
  if (this.connected && this.registered) {
    return;
  }

  console.log("Device is still disconnected");
  this.reset();
}

SmartDevice.prototype.getConnection = function () {
  if (this.connection) {
    return Promise.resolve(this.connection);
  }

  this.onStartConfiguration();

  return connectionManager(this.hotspotName)
    .then(connection => {
      console.log("Finishing configuration", connection);
      this.onFinishConfiguration();
      this.connection = connection;
    })
}

SmartDevice.prototype.connectWifi = function () {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const establishWifi = () => {
      console.log('Trying to connect to wifi...');
      this.connected = false;
      this.onStartConnectWifi();

      try {
        const status = wifi.getDetails();

        if (status.status === "connected") {
          attempts = 0;
          console.log('Wifi is already been connected');
          this.connected = true;

          this.onWifiConnected(status);

          return resolve(status);
        }

        wifi.connect(this.connection.ssid, {password: this.connection.password}, err => {
          if (err) {
            attempts++;
            this.onWifiError(err);

            if (this.params.reconnect && attempts <= this.params.connectionAttempts) {
              return setTimeout(() => establishWifi(), this.params.reconnectInterval);
            }

            return reject(err);
          }

          attempts = 0;
          console.log('Wifi connection successful!');
          this.connected = true;

          const status = wifi.getDetails();

          this.onWifiConnected(status);
          return resolve(status);
        });
      } catch (e) {
        return reject(e);
      }
    };

    establishWifi();
  })
};

SmartDevice.prototype.connectWebsocket = function () {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const establishWebsocket = () => {
      console.log('Trying to connect to WebSocket...');

      if (this.ws) {
        this.ws = null;
      }

      this.registered = false;
      this.onStartConnectWebsocket();

      try {
        this.ws = new WebSocket(this.connection.gateway, {
          port: this.params.ws.port,
          keepAlive: 30,
          headers: {
            pid: this.params.pid,
            vid: this.params.vid,
            sno: this.params.sno
          }
        });
      } catch (e) {
        console.log("Websocket creation error", e);
        attempts++;

        if (this.params.reconnect && attempts <= this.params.connectionAttempts) {
          console.log('Reconnect...');
          return setTimeout(() => establishWebsocket(), this.params.reconnectInterval);
        }

        this.reset();
        return;
      }

      this.ws.on('open', () => {
        console.log('WebSocket connection successful!');
        attempts = 0;

        this.registered = true;
        this.onWebsocketConnected(this.ws);
        setInterval(() => this.resetWatchdog(), 60 * 1000);

        return resolve(this.ws);
      });

      this.ws.on('message', packet => {
        this.processMessage(packet);
      });

      this.ws.on('close', () => {
        console.log('WebSocket connection close');
        attempts++;

        this.onWebsocketClose();

        if (this.params.reconnect && attempts <= this.params.connectionAttempts) {
          console.log('Reconnect...');
          return setTimeout(() => establishWebsocket(), this.params.reconnectInterval);
        }

        if (!this.ws) {
          return reject(new Error("Websocket reconnect limit reached"));
        }

        this.reset();
      });
    };

    establishWebsocket();
  });
};

SmartDevice.prototype.reset = function () {
  if (this.params.denyReset) {
    return;
  }
  console.log("Rebooting device...");

  E.reboot();
}

SmartDevice.prototype.connect = function () {
  return this.getConnection()
    .then(() => this.connectWifi())
    .then(() => this.connectWebsocket())
    .catch((error) => {
      console.log("Connection error acquired", error);

      this.reset();
    });
};

SmartDevice.prototype.processMessage = function (packet) {
  const message = JSON.parse(packet);

  switch (message.type) {
    case 'get':
      console.log('Send data to hub', message.uuid);
      this.sendUpdate(message.uuid);
      break;
    case 'send':
      console.log('Got data from hub', message);
      this.setData(message.data);
      break;
    case 'signal':
      console.log('Got signal from hub', message.signal);
      this.sendMessage({type: 'signal', signal: message.signal});
      break;
    case 'response':
      if (message.uuid && messageQueue.hasQueue(message.uuid)) {
        messageQueue.resolveMessage(message.uuid, message.response);
      }
      break;
    case 'response_error':
      if (message.uuid && messageQueue.hasQueue(message.uuid)) {
        messageQueue.rejectMessage(message.uuid, message.error);
      }
      break;
    case 'ping':
      this.sendMessage({uuid: message.uuid, type: 'pong'});
      break;
    default:
      console.log('Unhandled message', message);
  }
};

SmartDevice.prototype.sendMessage = function (message) {
  const packet = JSON.stringify(message);

  if (this.ws) {
    this.ws.send(packet);
  }
};

SmartDevice.prototype.sendUpdate = function (uuid) {
  const newData = this.getData();

  if (newData && newData.then) {
    return newData
      .then(data => {
        this.setData(data);
        this.sendData(data, uuid);
      })
      .catch(error => {
        console.log('Error getting data from ' + this.name, error);
        this.sendData(this.data, uuid);
      })
  }

  if (newData) {
    this.setData(newData);
    this.sendData(newData, uuid);
  } else {
    this.sendData(this.data, uuid);
  }
};

SmartDevice.prototype.getData = function () {
  return Promise.resolve(this.data);
};

SmartDevice.prototype.sendData = function (data, uuid) {
  return this.sendMessage({type: 'data', data: data, uuid: uuid});
};

SmartDevice.prototype.sendSignal = function (signal) {
  return this.sendMessage({type: 'signal', signal: signal});
};

SmartDevice.prototype.setData = function (newData, silent) {
  const oldData = this.data;

  this.data = Object.assign({}, this.data, newData);

  if (!silent) {
    this.process(oldData);
  }
};

SmartDevice.prototype.process = function (prevData) {
  console.log('Processing data change', this.data, prevData);
};

// connection events
SmartDevice.prototype.onStartConfiguration = function () {};

SmartDevice.prototype.onFinishConfiguration = function () {};

SmartDevice.prototype.onStartConnectWifi = function () {};

SmartDevice.prototype.onWifiConnected = function (wifi) {};

SmartDevice.prototype.onWifiError = function (e) {};

SmartDevice.prototype.onStartConnectWebsocket = function () {};

SmartDevice.prototype.onWebsocketConnected = function (ws) {};

SmartDevice.prototype.onWebsocketClose = function () {};

SmartDevice.prototype.sendAPIRequest = function (request, payload) {
  const uuid = Math.random().toString();

  this.sendMessage({type: 'request', uuid: uuid, command: request, payload: payload});

  return new Promise((resolve, reject) => {
    messageQueue.addMessage(uuid, (error, result) => {
      if (error) {
        return reject(error);
      }

      return resolve(result);
    }, 10);
  });
};

exports = SmartDevice;
