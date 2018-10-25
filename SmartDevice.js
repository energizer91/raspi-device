const wifi = require('Wifi');
const WebSocket = require('ws');

class SmartDevice {
  constructor(vid, pid, params) {
    this.params = Object.assign({
      pid: pid || '0000',
      vid: vid || '0000',
      sno: '00000000',
      wifi: {
        name: 'lol',
        password: 'kek'
      },
      ws: {
        host: 'localhost',
        port: '88'
      },
      reconnect: true,
      reconnectInterval: 5000,
      connectionAttempts: 10
    }, params);

    this.name = this.params.name || this.params.vid + '/' + this.params.pid + '/' + this.params.sno;
    this.ws = null;
    this.data = null;
  }

  connectWifi() {
    console.log('Trying to connect to wifi...');

    return new Promise((resolve, reject) => {
      let attempts = 0;

      const establishWifi = () => {
        wifi.connect(this.params.wifi.name, { password: this.params.wifi.password }, err => {
          if (err) {
            attempts++;

            if (this.params.reconnect && attempts <= this.params.connectionAttempts) {
              return setTimeout(() => establishWifi(), this.params.reconnectInterval);
            }

            return reject(err);
          }

          console.log('Wifi connection successful!');
          return resolve(wifi.getStatus());
        });
      };

      establishWifi();
    })
  }

  connectWebsocket() {
    console.log('Trying to connect to WebSocket...');
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const establishWebsocket = () => {
        if (this.ws) {
          this.ws = null;
        }

        this.ws = new WebSocket(this.params.ws.host, {
          port: this.params.ws.port,
          headers: {
            pid: this.params.pid,
            vid: this.params.vid,
            sno: this.params.sno
          }
        });

        this.ws.on('open', () => {
          console.log('WebSocket connection successful!');

          return resolve(this.ws);
        });

        this.ws.on('message', packet => {
          this.processMessage(packet);
        });

        this.ws.on('close', (code) => {
          console.error('WebSocket connection close', code);
          attempts++;

          if (this.params.reconnect) {
            return setTimeout(() => establishWebsocket(), this.params.reconnectInterval);
          }
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket connection error', error);

          if (this.params.reconnect && attempts <= this.params.connectionAttempts) {
            return setTimeout(() => this.connectWebsocket(), this.params.reconnectInterval);
          }

          return reject(error);
        });
      };

      establishWebsocket();
    })
  }

  connect() {
    return this.connectWifi()
      .then(() => this.connectWebsocket())
  }

  processMessage(packet) {
    const message = JSON.parse(packet);

    switch(message.type) {
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
      default:
        console.log('Unhandled message', message);
    }
  }

  sendMessage(message) {
    const packet = JSON.stringify(message);

    if (this.ws) {
      this.ws.send(packet);
    }
  }

  sendUpdate(uuid) {
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
  }

  // can be promise or plain data
  getData() {
    return Promise.resolve(this.data);
  }

  sendData(data, uuid) {
    return this.sendMessage({ type: 'data', data, uuid });
  }

  sendSignal(key, value) {
    return this.sendMessage({ type: 'signal', signal: {[key]: value} });
  }

  setData(newData) {
    const oldData = this.data;

    this.data = Object.assign({}, this.data, newData);
    this.process(oldData);
  }

  process(prevData) {
    console.log('Processing data change', this.data, prevData);
  }
}

exports = SmartDevice;
