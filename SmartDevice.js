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
  this.normalWebsocketDisconnect = false;
  this.wifiReconnectTimeout = null;
  this.wsReconnectTimeout = null;

  wifi.on('connected', details => {
    console.log("Wifi connected with details", details);
    this.connected = true;
    this.onWifiConnected(details);

    this.disconnectWebsocket(true);
    this.connectWebsocket();
  });

  wifi.on('disconnected', details => {
    this.connected = false;
    console.log("Wifi disconnected with details", details);
    this.onWifiDisconnected(details);

    if (details.reason !== "8") { // 8 - normal disconnect
      console.log("Reconnecting wifi...");
      if (this.wifiReconnectTimeout) {
        clearTimeout(this.wifiReconnectTimeout);
      }

      this.wifiReconnectTimeout = setTimeout(() => this.connectWifi(), 5000);
    }
  });

  return this;
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

SmartDevice.prototype.delay = function (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

SmartDevice.prototype.connectWifi = function () {
  return new Promise((resolve, reject) => {
    console.log('Trying to connect to wifi...');
    this.connected = false;
    this.onStartConnectWifi();
    const status = wifi.getDetails();

    if (status.status === "connected") {
      console.log('Wifi is already been connected');
      this.connected = true;

      this.onWifiConnected(status);
      this.disconnectWebsocket(true);
      this.connectWebsocket();

      return resolve(status);
    }

    try {
      wifi.connect(this.connection.ssid, {password: this.connection.password}, err => {
        if (err) {
          this.onWifiError(err);

          return reject(err);
        }
        console.log('Wifi connection successful!');
        const status = wifi.getDetails();

        return resolve(status);
      });
    } catch (e) {
      return reject(e);
    }
  })
};

SmartDevice.prototype.connectWebsocket = function () {
  return new Promise((resolve, reject) => {
    console.log('Trying to connect to WebSocket...');

    if (this.ws) {
      this.ws = null;
    }

    this.registered = false;
    this.normalWebsocketDisconnect = false;
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

      return reject(e);
    }

    this.ws.on('open', () => {
      console.log('WebSocket connection successful!');

      this.registered = true;
      this.onWebsocketConnected(this.ws);

      return resolve(this.ws);
    });

    this.ws.on('message', packet => {
      this.processMessage(packet);
    });

    this.ws.on('close', () => {
      console.log('WebSocket connection close');

      if (this.normalWebsocketDisconnect) {
        this.normalWebsocketDisconnect = false;
        return;
      }

      this.onWebsocketClose();

      this.registered = false;

      if (this.connected) {
        console.log("Reconnecting websocket...");
        if (this.wsReconnectTimeout) {
          clearTimeout(this.wsReconnectTimeout);
        }

        this.wsReconnectTimeout = setTimeout(() => this.connectWebsocket(), 5000);
      }
    });
  });
};

SmartDevice.prototype.disconnectWebsocket = function (normal) {
  if (this.ws) {
    this.normalWebsocketDisconnect = normal;
    this.registered = false;
    this.ws.close();
  }
}

SmartDevice.prototype.disconnect = function () {
  return new Promise(resolve => {
    this.disconnectWebsocket(true);

    if (this.connected) {
      this.connected = false;
      wifi.disconnect(resolve);
    } else {
      resolve();
    }
  });
}

SmartDevice.prototype.reset = function () {
  if (this.params.denyReset) {
    return;
  }
  console.log("Rebooting device...");

  E.reboot();
}

SmartDevice.prototype.connect = function () {
  return this.getConnection()
    .then(() => this.connectWifi());
    // .catch((error) => {
    //   console.log("Connection error acquired", error);
    //
    //   this.reset();
    // });
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
  return this.sendMessage({type: 'data', data: data, uuid: uuid, metrics: process.memory()});
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

SmartDevice.prototype.onWifiConnected = function (details) {};

SmartDevice.prototype.onWifiDisconnected = function (details) {};

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
