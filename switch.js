const SmartSwitch = require('SmartSwitch');

const params = {
  sno: '00000002',
  name: 'Smart switch',
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

const smartSwitch = new SmartSwitch(params);

smartSwitch.connect();
