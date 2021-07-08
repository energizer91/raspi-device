const SmartThermometer = require("SmartThermometer");

const thermometer = new SmartThermometer({
  config: {
    pins: {
      sda: NodeMCU.D4,
      scl: NodeMCU.D5
    }
  },
  sno: "00000003"
});

thermometer.connect();