const SmartDevice = require('SmartDevice');
const RGBLed = require('RGBLed');

const vid = '0001';
const pid = '0006';

function SmartRGB(params) {
  SmartDevice.call(this, vid, pid, params);

  this.data = {
    enabled: true,
    color: '#FF00FF'
  };
  this.LED = RGBLed.connect(params.config.pins, this.data.enabled, this.data.color);
}

SmartRGB.prototype = Object.create(SmartDevice.prototype);

SmartRGB.prototype.process = function () {
  if (this.data.enabled) {
    this.LED.on();
  } else {
    this.LED.off();
  }

  this.LED.setColor(this.data.color);
};

exports = SmartRGB;
