const SmartDevice = require('SmartDevice');
const dht = require('DHT11');

const vid = '0001';
const pid = '0003';

function SmartThermometer(params) {
  SmartDevice.call(this, vid, pid, params);

  this.retries = params.retries || 10;
  this.pin = params.config.pin;
  this.thermometer = dht.connect(this.pin);
  this.request = false;
  this.data = {
    temperature: 0,
    humidity: 0
  }
}

SmartThermometer.prototype = Object.create(SmartDevice.prototype);

SmartThermometer.prototype.getData = function () {
  if (this.request) {
    return this.request;
  }

  this.request = new Promise((resolve, reject) => {
    if (!this.thermometer) {
      return reject(new Error('Thermometer is not defined'));
    }

    this.thermometer.read(data => {
      console.log('Thermometer response', data);

      setTimeout(() => {
        this.request = null;
      }, 5000);

      if (data.err) {
        if (data.checksumError) {
          return reject(new Error('Checksum error'));
        }

        return reject(new Error('No data received'));
      }

      return resolve({
        temperature: data.temp,
        humidity: data.rh
      });
    }, this.retries);
  });

  return this.request;
};

exports = SmartThermometer;
