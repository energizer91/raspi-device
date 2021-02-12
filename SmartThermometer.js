const SmartDevice = require('SmartDevice');
const dht = require('DHT11');

function SmartThermometer(params) {
  SmartDevice.call(this, SmartThermometer.vid, SmartThermometer.pid, params);

  this.retries = params.retries || 10;
  this.pin = params.config.pin;
  this.thermometer = dht.connect(this.pin);
  this.request = false;
  this.updating = false; // to not call update function more than 1 time per 10 seconds
  this.data = {
    temperature: 0,
    humidity: 0
  }

  this.getTemperature();

  setInterval(() => this.getTemperature(), 30000);
}

SmartThermometer.prototype = Object.create(SmartDevice.prototype);

SmartThermometer.prototype.getTemperature = function() {
  if (!this.thermometer) {
    throw new Error('Thermometer is not defined');
  }

  if (this.updating) {
    return;
  }

  this.updating = true;

  const updatingTimeout = setInterval(() => {
    this.updating = false;
  }, 10000);

  this.thermometer.read(data => {
    this.updating = false;
    clearInterval(updatingTimeout);

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

SmartThermometer.vid = "0001";
SmartThermometer.pid = "0003";

exports = SmartThermometer;
