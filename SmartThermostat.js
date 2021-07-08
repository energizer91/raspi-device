const SmartDevice = require('SmartDevice');
const DanfossThermostat = require('danfossThermostat');

function executeSequentally(promises) {
  return promises.reduce((acc, p) => acc.then(() => p), Promise.resolve());
}

function SmartThermostat(params) {
  SmartDevice.call(this, SmartThermostat.vid, SmartThermostat.pid, params);

  this.retries = params.retries || 10;
  this.thermostats = (this.config.thermostats || []).map(t => new DanfossThermostat(t.name, t.mac, t.secret));
  this.updateInterval = 60 * 1000;

  this.lastUpdate = null;
  this.errors = 0;
  this.targetErrorsToReset = 6;
  this.needUpdate = false;
  this.updating = false;
  this.data = this.thermostats.reduce((acc, t) => {
    acc[t.mac] = {
      name: t.name,
      current: 0,
      target: 0
    }

    return acc;
  }, {});

  setInterval(() => this.updateValues(), this.updateInterval);

  this.updateValues();
}

SmartThermostat.prototype = Object.create(SmartDevice.prototype);

SmartThermostat.prototype.updateThermostat = function (thermostat) {
  return new Promise((resolve, reject) => {
    console.log("Updating thermostat", thermostat.name);
    const errorTimeout = setTimeout(() => reject(new Error("Thermostat " + thermostat.name + " update timeout")), 60 * 1000);

    return thermostat.observe()
      .then(() => thermostat.getService())
      .then(() => thermostat.login())
      .then(() => {
        if (this.needUpdate) {
          const temperature = this.data[thermostat.mac].target;

          console.log("Writing new temperature");

          return thermostat.setTemperature(temperature);
        }

        console.log("Getting new temperature");

        return thermostat.getTemperature()
          .then(temperature => {
            const newData = {};

            newData[thermostat.mac] = {
              name: thermostat.name,
              current: temperature.current,
              target: temperature.target
            };

            this.setData(newData, true);
          });
      })
      .catch(e => {
        this.errors++;
        console.log("Thermostat error", thermostat.name, e);
      })
      .then(() => thermostat.disconnect())
      .then(() => {
        if (errorTimeout) {
          clearTimeout(errorTimeout);
          console.log("Thermostat update complete", thermostat.name);

          if (this.errors > this.targetErrorsToReset) {
            console.log("Too many errors");

            this.reset();

            return resolve();
          }

          return resolve();
        }
      });
  });
}

SmartThermostat.prototype.updateValues = function () {
  if (!this.thermostats || !this.thermostats.length) {
    return;
  }



  if (!this.needUpdate && (this.lastUpdate && (Date.now() - this.lastUpdate < 60 * 60 * 1000))) {
    console.log("Nothing to update");
    return;
  }

  if (this.updating) {
    console.log("Update is already in progress");
    return;
  }

  this.updating = true;

  return executeSequentally(this.thermostats.map(thermostat =>
      this.updateThermostat(thermostat)
        .then(() => this.delay(5000))
    ))
    .catch(e => {
      console.log("Thermostats updating error", e);
    })
    .then(() => {
      this.lastUpdate = Date.now();
      this.needUpdate = false;
      this.updating = false;
    });
}

SmartThermostat.prototype.process = function () {
  console.log("New temperature has been reported");
  this.needUpdate = true;
}

SmartThermostat.vid = "0001";
SmartThermostat.pid = "0009";

exports = SmartThermostat;
