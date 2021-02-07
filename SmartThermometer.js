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

  this.getTemperature();

  setTimeout(() => this.getTemperature(), 10000);
}

SmartThermometer.prototype = Object.create(SmartDevice.prototype);

SmartThermometer.prototype.getTemperature = function() {
  if (!this.thermometer) {
    throw new Error('Thermometer is not defined');
  }

  this.thermometer.read(data => {
    console.log('Thermometer response', data);

    if (data.err) {
      if (data.checksumError) {
        throw new Error('Checksum error');
      }

      throw new Error('No data received');
    }

    this.setData({
      temperature: data.temp,
      humidity: data.rh
    });
  }, this.retries);
}

exports = SmartThermometer;
