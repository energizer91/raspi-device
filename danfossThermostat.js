const xxtea = require("xxtea");

function swapEndianness(b) {
  const result = new Uint8Array(b.length);

  for (let i = 0; i < b.length; i++) {
    result[i] = b[(Math.floor(i / 4) * 4) + (3 - (i % 4))];
  }

  return result;
}

function DanfossThermostat (name, mac, secret) {
  this.name = name || "Thermostat_" + mac;
  this.mac = (mac || '').toLowerCase();
  this.secret = secret ? new Uint8Array(secret) : null;

  this.mainServiceUUID = '10020000-2749-0001-0000-00805F9B042F';
  this.pinUUID = '10020001-2749-0001-0000-00805F9B042F';
  this.temperatureUUID = '10020005-2749-0001-0000-00805F9B042F';
  this.secretUUID = '1002000B-2749-0001-0000-00805F9B042F';

  this.gatt = null;
  this.service = null;
}

DanfossThermostat.prototype.connect = function () {
  return NRF.connect(this.mac + ' public')
    .then(gatt => {
      this.gatt = gatt;

      return this.gatt;
    });
}

DanfossThermostat.prototype.disconnect = function () {
  if (!this.gatt) {
    return Promise.resolve();
  }

  return this.gatt.disconnect()
    .then(() => {
      this.service = null;
      this.gatt = null;
    })
}

DanfossThermostat.prototype.getService = function () {
  if (!this.gatt) {
    return Promise.reject(new Error("GATT not defined"));
  }

  return this.gatt.getPrimaryService(this.mainServiceUUID)
    .then(service => {
      this.service = service;

      return this.service;
    })
}

DanfossThermostat.prototype.getSecret = function () {
  if (!this.service) {
    return Promise.reject(new Error("Service not defined"));
  }

  return this.getCharacteristic(this.secretUUID)
    .then(characteristic => characteristic.readValue())
    .then(secret => {
      this.secret = secret.buffer;
    })
}

DanfossThermostat.prototype.getCharacteristic = function (uuid) {
  if (!this.service) {
    return Promise.reject(new Error("Service not defined"));
  }

  return this.service.getCharacteristic(uuid);
}

DanfossThermostat.prototype.readValue = function (characteristic) {
  if (!characteristic) {
    return Promise.reject(new Error("Characteristic not defined"));
  }

  if (!this.secret) {
    return Promise.reject(new Error("Secret not defined"));
  }

  return characteristic.readValue()
    .then(value => {
      return swapEndianness(xxtea.decrypt(swapEndianness(value.buffer), this.secret));
    });
}

DanfossThermostat.prototype.writeValue = function (characteristic, value) {
  if (!characteristic) {
    return Promise.reject(new Error("Characteristic not defined"));
  }

  if (!this.secret) {
    return Promise.reject(new Error("Secret not defined"));
  }

  const encryptedValue = swapEndianness(xxtea.encrypt(swapEndianness(new Uint8Array(value)), this.secret));

  return characteristic.writeValue(encryptedValue);
}

DanfossThermostat.prototype.login = function () {
  if (!this.service) {
    return Promise.reject(new Error("Service not defined"));
  }

  return this.getCharacteristic(this.pinUUID)
    .then(characteristic => characteristic.writeValue([0,0,0,0]));
}

DanfossThermostat.prototype.getTemperature = function () {
  if (!this.service) {
    return Promise.reject(new Error("Service not defined"));
  }

  return this.getCharacteristic(this.temperatureUUID)
    .then(characteristic => this.readValue(characteristic))
    .then(value => {
      return {
        current: value[1] / 2,
        target: value[0] / 2
      }
    });
}

DanfossThermostat.prototype.setTemperature = function (temperature) {
  if (!this.service) {
    return Promise.reject(new Error("Service not defined"));
  }

  const temperatureData = [temperature * 2, 0, 0, 0, 0, 0, 0, 0];

  return this.getCharacteristic(this.temperatureUUID)
    .then(characteristic => this.writeValue(characteristic, temperatureData));
}

exports = DanfossThermostat;