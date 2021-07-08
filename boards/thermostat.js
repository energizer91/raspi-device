const SmartThermostat = require("SmartThermostat");
ESP32.setBLE_Debug(4);
NRF.setRSSIHandler();

NRF.on("disconnect", reason => {
  console.log("NRF Disconnect. Reason:", reason);
});

NRF.on("connect", address => {
  console.log("NRF Connect. address:", address);
});

const thermostat = new SmartThermostat({
  sno: "00000010"
});

thermostat.connect();