const SmartDevice = require('SmartDevice');
const DanfossThermostat = require('danfossThermostat');

const HEATING_COOLING_STATES = {
  OFF: 0,
  HEAT: 1,
  COOL: 2,
  AUTO: 3
}

function SmartThermostat(params) {
  SmartDevice.call(this, SmartThermostat.vid, SmartThermostat.pid, params);

  this.retries = params.retries || 10;
  this.thermostats = (this.config.thermostats || []).map(t => new DanfossThermostat(t.name, t.mac, t.secret));
  this.updateInterval = 5 * 60 * 1000;

  this.needUpdate = false;
  this.data = this.thermostats.reduce((acc, t) => {
    acc[t.mac] = {
      name: t.name,
      current: 0,
      target: 0,
      targetHeatingCooling: HEATING_COOLING_STATES.OFF,
      currentHeatingCooling: HEATING_COOLING_STATES.AUTO
    }

    return acc;
  }, {});

  this.updateValues();
}

SmartThermostat.prototype = Object.create(SmartDevice.prototype);

SmartThermostat.prototype.updateValues = function () {
  if (!this.thermostats || !this.thermostats.length) {
    return;
  }

  const thermostatActions = this.thermostats.map(thermostat => {
    return thermostat.connect()
      .then(() => thermostat.getService())
      .then(() => thermostat.login())
      .then(() => {
        if (this.needUpdate) {
          const temperature = this.data[thermostat.mac].target;

          return thermostat.setTemperature(temperature);
        }

        return thermostat.getTemperature()
          .then(temperature => {
            const temperatureDelta = temperature.target - temperature.current;
            let targetHeatingCooling = HEATING_COOLING_STATES.OFF;

            if (temperatureDelta < 0) {
              targetHeatingCooling = HEATING_COOLING_STATES.COOL;
            } else if (temperatureDelta > 0) {
              targetHeatingCooling = HEATING_COOLING_STATES.HEAT;
            }

            const newData = {};

            newData[thermostat.mac] = {
              name: thermostat.name,
              current: temperature.current,
              target: temperature.target,
              targetHeatingCooling: targetHeatingCooling,
              currentHeatingCooling: HEATING_COOLING_STATES.AUTO
            };

            this.setData(newData, true);
          });
      })
      .catch(e => console.log("Thermostat error", e))
      .then(() => thermostat.disconnect());
  });

  return Promise.all(thermostatActions)
    .catch(e => {
      console.log("Thermostats updating error", e);
    })
    .then(() => {
      this.needUpdate = false;
      setTimeout(() => this.updateValues(), this.updateInterval);
    });
}

SmartThermostat.prototype.process = function () {
  this.needUpdate = true;
}

SmartThermostat.vid = "0001";
SmartThermostat.pid = "0009";

exports = SmartThermostat;
