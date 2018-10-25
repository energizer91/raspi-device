const SmartThermometer = require('SmartThermometer');

const params = {
  pid: '0003',
  vid: '0001',
  sno: '00000003',
  name: 'Smart thermometer',
  wifi: {
    name: 'COMHEM_6233f6',
    password: 'fdnmvmzy'
  },
  ws: {
    host: '192.168.0.14',
    port: 8080
  },
  config: {
    pin: NodeMCU.D5
  }
};

const smartSwitch = new SmartThermometer(params);

smartSwitch.connect();
