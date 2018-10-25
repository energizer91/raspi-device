const SmartDevice = require('SmartDevice');

const vid = '0001';
const pid = '0005';

class SmartRelay extends SmartDevice {
  constructor(params) {
    super(vid, pid, params);

    this.relay = params.config.pin;
    this.data = {
      enabled: false
    }
  }

  process() {
    const {enabled} = this.data;

    digitalWrite(this.relay, enabled);
  }
}

exports = SmartRelay;
