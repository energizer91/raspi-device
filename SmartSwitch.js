const SmartDevice = require('SmartDevice');

const vid = '0001';
const pid = '0002';

class SmartSwitch extends SmartDevice {
  constructor(params) {
    super(vid, pid, params);

    this.BTN = params.config.pin;
    this.detectButtonChange();
  }

  detectButtonChange() {
    setWatch(() => {
      this.sendSignal('enabled', true);
    }, this.BTN, {
      repeat: true,
      edge: 'rising',
      debounce: 50
    });
  }

  getData() {
    return digitalRead(this.BTN);
  }
}

exports = SmartSwitch;
