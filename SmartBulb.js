const SmartDevice = require('SmartDevice');

const vid = '0001';
const pid = '0001';

class SmartBulb extends SmartDevice {
  constructor(params) {
    super(vid, pid, params);

    this.LED = params.config.pin;
    this.data = {
      enabled: true,
      color: 'white',
      brightness: 70
    };
  }

  process() {
    const { enabled } = this.data;

    if (enabled) {
      digitalWrite(this.LED, 0);
    } else {
      digitalWrite(this.LED, 1);
    }
  }
}

exports = SmartBulb;
