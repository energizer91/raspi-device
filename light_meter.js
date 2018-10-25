const SmartLightMeter = require('SmartLightMeter');

const params = {
  pid: '0004',
  vid: '0001',
  sno: '00000004',
  name: 'Smart light meter',
  wifi: {
    name: 'COMHEM_6233f6',
    password: 'fdnmvmzy'
  },
  ws: {
    host: '192.168.0.14',
    port: 8080
  },
  config: {
    pin: NodeMCU.D8
  }
};

const lightMeter = new SmartLightMeter(params);

lightMeter.connect();
