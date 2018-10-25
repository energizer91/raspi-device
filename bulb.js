const SmartBulb = require('SmartBulb');

const params = {
  sno: '00000001',
  name: 'Smart bulb',
  wifi: {
    name: 'COMHEM_6233f6',
    password: 'fdnmvmzy'
  },
  ws: {
    host: '192.168.0.14',
    port: 8080
  },
  config: {
    pin: NodeMCU.D4
  }
};

const bulb = new SmartBulb(params);

bulb.connect();
