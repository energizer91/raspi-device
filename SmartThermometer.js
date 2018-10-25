const SmartDevice = require('SmartDevice');
const dht = require('DHT22');

const vid = '0001';
const pid = '0003';

class SmartThermometer extends SmartDevice {
  constructor(params) {
    super(vid, pid, params);

    this.pin = params.config.pin;
    this.thermometer = dht.connect(this.pin);
    this.data = {
      temperature: 0,
      humidity: 0
    }
  }

  getData() {
    return new Promise((resolve, reject) => {
      if (!this.thermometer) {
        return reject(new Error('Thermometer is not defined'));
      }

      this.thermometer.read(data => {
        if (data.err) {
          if (data.checksumError) {
            return reject(new Error('No data received'));
          }

          return reject(new Error('Checksum error'));
        }

        return resolve({
          temperature: data.temp,
          humidity: data.rh
        });
      });
    });
  }
}

exports = SmartThermometer;
