const SmartThermostat = require("SmartThermostat");
ESP32.setBLE_Debug(4);
NRF.setRSSIHandler();


const thermostat = new SmartThermostat({
  sno: "00000010"
});