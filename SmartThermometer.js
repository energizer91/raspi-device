const SmartDevice = require('SmartDevice');
const sht = require('SHT3C');

function CToF(c) {
  return (c * 9 / 5) + 32;
}

function FToC(f) {
  return (f - 32) * 5 / 9;
}

function getHeatIndex(T, RH) {
  T = CToF(T);

  let HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094));

  if (HI > 79) {
    HI = -42.379 + 2.04901523*T + 10.14333127*RH - .22475541*T*RH - .00683783*T*T - .05481717*RH*RH + .00122874*T*T*RH + .00085282*T*RH*RH - .00000199*T*T*RH*RH;

    if (RH < 13 && T >= 80 && T <= 112) {
      HI -= ((13-RH)/4)*Math.sqrt((17-Math.abs(T-95))/17);
    } else if (RH > 85 && T >= 80 && T <= 87) {
      HI += ((RH-85)/10) * ((87-T)/5);
    }
  }

  return FToC(HI);
}

function SmartThermometer(params) {
  SmartDevice.call(this, SmartThermometer.vid, SmartThermometer.pid, params);

  this.retries = params.retries || 50;
  this.pins = params.config.pins;

  I2C1.setup(this.pins);

  this.thermometer = sht.connectI2C(I2C1);
  this.request = false;
  this.data = {
    temperature: 0,
    humidity: 0,
    heatIndex: 0
  }

  this.getTemperature();

  setInterval(() => this.getTemperature(), 30000);
}

SmartThermometer.prototype = Object.create(SmartDevice.prototype);

SmartThermometer.prototype.getTemperature = function() {
  if (!this.thermometer) {
    throw new Error('Thermometer is not defined');
  }

  this.thermometer.read(data => {
    if (data.err) {
      console.log("Reading error", data);
      if (data.checksumError) {
        throw new Error('Checksum error');
      }

      throw new Error('No data received');
    }

    this.setData({
      temperature: data.temp,
      humidity: data.humidity,
      heatIndex: getHeatIndex(data.temp, data.humidity)
    });
  }, this.retries);
}

SmartThermometer.vid = "0001";
SmartThermometer.pid = "0003";

exports = SmartThermometer;
