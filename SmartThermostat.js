const SmartDevice = require('SmartDevice');
const DanfossThermostat = require('danfossThermostat');

const HEATING_COOLING_STATES = {
  OFF: 0,
  HEAT: 1,
  COOL: 2,
  AUTO: 3
}

function executeSequentally(promises) {
  return promises.reduce((acc, p) => acc.then(() => p), Promise.resolve());
}

function SmartThermostat(params) {
  SmartDevice.call(this, SmartThermostat.vid, SmartThermostat.pid, params);

  this.retries = params.retries || 10;
  this.thermostats = (this.config.thermostats || []).map(t => new DanfossThermostat(t.name, t.mac, t.secret));
  this.updateInterval = 10 * 1000;
  this.updateCounter = -1; // to run it first time

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

  if (this.updateCounter < 30) {
    this.updateCounter++;
  } else {
    this.updateCounter = 0;
  }

  if (!this.needUpdate && this.updateCounter > 0 && this.updateCounter < 30) {
    return Promise.resolve();
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

        if (this.updateCounter < 30 && this.updateCounter > 0) {
          return;
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

  return executeSequentally(thermostatActions)
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
