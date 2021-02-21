const SmartThermostat = require("SmartThermostat");
ESP32.setBLE_Debug(4);


const thermostat = new SmartThermostat({
  sno: "00000010"
});

thermostat.connect();