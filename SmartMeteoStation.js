const SmartDevice = require('SmartDevice');
const LCD = require("SH1106");

require("Font8x12").add(Graphics);
require("Font6x8").add(Graphics);

const vid = '0001';
const pid = '0007';

function SmartMeteoStation(params) {
  SmartDevice.call(this, vid, pid, params);

  this.retries = params.retries || 10;
  this.lcdPins = params.config.lcd;
  this.apiKey = params.config.apiKey;
  this.cityId = params.config.cityId;

  I2C1.setup({sda: this.lcdPins[0], scl: this.lcdPins[1], bitrate:400000});
  this.lcd = LCD.connect(I2C1, () => this.onLCDReady(), {address: 0x3C});

  // menu items
  this.title = 'Welcome';

  this.data = {
    name: '',
    temperature: 0,
    humidity: 0,
    weather: ''
  };

  this.lcdReady = false;
  this.updateTimer = null;
}

SmartMeteoStation.prototype = Object.create(SmartDevice.prototype);

SmartMeteoStation.prototype.onLCDReady = function() {
  this.lcdReady = true;
  this.onLCDConnect();
};

SmartMeteoStation.prototype.onLCDConnect = function() {

};

SmartMeteoStation.prototype.onStartConfiguration = function () {
  this.setStatusBar();
  this.writeText('Start Wifi config');
}

SmartMeteoStation.prototype.onFinishConfiguration = function () {
  this.setStatusBar();
  this.writeText('Wifi config ok!');
}

SmartMeteoStation.prototype.onStartConnectWifi = function () {
  if (this.updateTimer) {
    clearInterval(this.updateTimer);
  }

  this.setStatusBar();
  this.writeText('Connecting...');
};

SmartMeteoStation.prototype.onWifiConnected = function (wifi) {
  this.setStatusBar();
  this.writeText('Wifi ok!');
};

SmartMeteoStation.prototype.onWifiError = function (e) {
  if (this.updateTimer) {
    clearInterval(this.updateTimer);
  }

  this.setStatusBar();
  this.writeText('Wifi error! ' + e.message);
};

SmartMeteoStation.prototype.onStartConnectWebsocket = function () {
  if (this.updateTimer) {
    clearInterval(this.updateTimer);
  }

  this.setStatusBar();
  this.writeText('Registering...');
};

SmartMeteoStation.prototype.onWebsocketConnected = function () {
  this.updateForecast();
  // TODO: rewrite to getting weather by server, not client
  this.updateTimer = setInterval(() => this.updateForecast(), 60000);
};

SmartMeteoStation.prototype.onWebsocketError = function (e) {
  if (this.updateTimer) {
    clearInterval(this.updateTimer);
  }

  this.setStatusBar();
  this.writeText('Websocket error! ' + e.message);
};

SmartMeteoStation.prototype.updateForecast = function () {
  this.title = 'Getting temperature';
  this.setStatusBar();
  if (!this.data.temperature) {
    this.writeText('Getting Forecast');
  }
  this.getForecast();
};

SmartMeteoStation.prototype.writeText = function (text, x, y) {
  if (!this.lcdReady) {
    return;
  }

  this.clearArea(0, 12, 128, 64);

  if (!text) {
    return;
  }

  this.lcd.setFont8x12();
  this.lcd.drawString(text, x || 0, y || 12);

  this.lcd.flip();
};

SmartMeteoStation.prototype.setStatusBar = function () {
  if (!this.lcdReady) {
    return;
  }

  this.clearArea(0, 0, 128, 12);

  const title = this.title.slice(0, 32);

  this.lcd.setFont6x8();
  this.lcd.drawString(title, 0, 2);

  if (this.connected) {
    this.lcd.drawString('+', 110, 2);
  } else {
    this.lcd.drawString('-', 110, 2);
  }

  if (this.registered) {
    this.lcd.drawString('+', 120, 2);
  } else {
    this.lcd.drawString('-', 120, 2);
  }

  this.lcd.flip();
};

SmartMeteoStation.prototype.clearArea = function (x1, y1, x2, y2) {
  if (!this.lcd) {
    return;
  }

  this.lcd.setColor(0, 0, 0);
  this.lcd.fillRect(x1, y1, x2, y2);
  this.lcd.setColor(1, 1, 1);
};

SmartMeteoStation.prototype.getForecast = function () {
  return this.sendAPIRequest('makeHTTPCall', {
    method: 'get',
    url: 'https://api.openweathermap.org/data/2.5/weather',
    params: {
      id: this.cityId,
      appId: this.apiKey
    }
  })
    .then(forecast => {
      console.log('forecast', forecast);

      this.setData({
        name: forecast.name,
        weather: forecast.weather && forecast.weather.length && forecast.weather[0].description || forecast.weather[0].main,
        temperature: Math.round(forecast.main.temp - 273.15),
        humidity: forecast.main.humidity
      });

      this.title = this.data.name;

      this.renderTemperature();
    })
    .catch(error => this.writeText('Error: ' + error.message));
};

SmartMeteoStation.prototype.renderTemperature = function () {
  if (!this.lcd) {
    return;
  }

  this.clearArea(0, 12, 128, 64);

  this.lcd.setFontVector(30);
  const temperatureWidth = this.lcd.stringWidth(this.data.temperature);
  this.lcd.drawString(this.data.temperature, 0, 12);
  this.lcd.drawCircle(temperatureWidth + 6, 16, 3);
  this.lcd.drawString('C', temperatureWidth + 10, 12);
  this.lcd.setFont6x8();
  this.lcd.drawString(this.data.humidity + '% RH', 0, 45);
  this.lcd.drawString(this.data.weather, 0, 54);

  this.lcd.flip();
};

exports = SmartMeteoStation;
