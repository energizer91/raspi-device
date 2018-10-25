const SmartDevice = require('SmartDevice');

const vid = '0001';
const pid = '0004';

class SmartLightMeter extends SmartDevice {
  constructor(params) {
    super(vid, pid, params);

    this.pin = params.config.pin;
    this.pollingInterval = null;
    this.pollingTime = params.config.interval || 1000;
    this.data = {
      light: 0
    };
    this.startPolling();
  }

  startPolling() {
    this.pollingInterval = setInterval(() => {
      const light = this.getLight();

      this.setData({ light: light });
    }, this.pollingTime);
  }

  stopPolling() {
    clearInterval(this.pollingInterval);
  }

  getLight() {
    return analogRead(this.pin) * 100;
  }

  getData() {
    return this.getLight();
  }
}

exports = SmartLightMeter;
