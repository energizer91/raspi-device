const SmartDevice = require('SmartDevice');

const vid = '0001';
const pid = '0001';

function SmartBulb(params) {
  SmartDevice.call(this, vid, pid, params);

  console.log('SmartBulb this', this);

  this.LED = params.config.pin;
  this.data = {
    enabled: true,
    color: 'white',
    brightness: 70
  };
}

SmartBulb.prototype = Object.create(SmartDevice.prototype);

SmartBulb.prototype.process = function () {
  if (this.data.enabled) {
    digitalWrite(this.LED, 1);
  } else {
    digitalWrite(this.LED, 0);
  }
};

exports = SmartBulb;
