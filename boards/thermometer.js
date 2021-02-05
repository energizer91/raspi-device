const SmartThermometer = require("SmartThermometer");

const thermometer = new SmartThermometer({
  config: {
    pin: NodeMCU.D4
  },
  sno: "00000003"
});

thermometer.connect();