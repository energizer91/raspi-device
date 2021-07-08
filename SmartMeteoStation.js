const SmartThermometer = require('SmartThermometer');
const LCD = require("SH1106");

require("Font8x12").add(Graphics);
require("Font6x8").add(Graphics);

function SmartMeteoStation(params) {
  SmartThermometer.call(this, params);

  this.retries = params.retries || 10;
  this.lcdPins = params.config.lcd;
  this.buttonPin = params.config.button;
  this.apiKey = params.config.apiKey;
  this.cities = params.config.cities;

  I2C1.setup({sda: this.lcdPins[0], scl: this.lcdPins[1], bitrate:400000});
  this.lcd = LCD.connect(I2C1, () => this.onLCDReady(), {address: 0x3C});

  this.connectButton();

  this.selectedTab = 0;
  this.screenIsOff = false;
  this.screenTimeout = null;

  this.tabs = [
    {
      type: "indoor",
      title: "Indoor"
    }
  ];

  this.tabs = this.tabs.concat(params.config.cities.map(city => ({
    type: "forecast",
    cityId: city,
    title: '',
    temperature: 0,
    humidity: 0,
    weather: '',
    timestamp: 0
  })));

  this.lcdReady = false;
  this.rendered = false;
}

SmartMeteoStation.prototype = Object.create(SmartThermometer.prototype);

SmartMeteoStation.prototype.flip = function () {
  if (!this.lcdReady) {
    return;
  }

  if (this.rendered) {
    return;
  }

  this.rendered = true;

  setTimeout(() => {
    this.lcd.flip();

    this.rendered = false;
  }, 0);
}

SmartMeteoStation.prototype.connectButton = function () {
  pinMode(this.buttonPin, 'input_pullup');
  setWatch((e) => this.onButtonPress(e), this.buttonPin, { repeat: true, edge: 'falling', debounce: 50 });
}

SmartMeteoStation.prototype.onLCDReady = function() {
  this.lcdReady = true;
  this.onLCDConnect();
};

SmartMeteoStation.prototype.onLCDConnect = function() {
  this.setStatusBar();
  this.setTabs();
  this.changeTab();

  this.updateTemperature();
  this.screenTimeout = setTimeout(() => this.LCDOff(), 10000);
};

SmartMeteoStation.prototype.LCDOff = function () {
  if (!this.lcd) {
    return;
  }

  this.lcd.off();
  this.screenIsOff = true;

  if (this.screenTimeout) {
    clearTimeout(this.screenTimeout);
    this.screenTimeout = null;
  }
}

SmartMeteoStation.prototype.LCDOn = function () {
  if (!this.lcd) {
    return;
  }

  this.lcd.on();
  this.screenIsOff = false;

  if (this.screenTimeout) {
    clearTimeout(this.screenTimeout);
  }

  this.screenTimeout = setTimeout(() => this.LCDOff(), 10000);
}

SmartMeteoStation.prototype.onStartConfiguration = function () {
  this.setStatusBar();
}

SmartMeteoStation.prototype.onFinishConfiguration = function () {
  this.setStatusBar();
}

SmartMeteoStation.prototype.onStartConnectWifi = function () {
  this.setStatusBar();
};

SmartMeteoStation.prototype.onWifiConnected = function (wifi) {
  this.setStatusBar();
};

SmartMeteoStation.prototype.onWifiError = function (e) {
  this.setStatusBar();
};

SmartMeteoStation.prototype.onStartConnectWebsocket = function () {
  this.setStatusBar();
};

SmartMeteoStation.prototype.onWebsocketConnected = function () {
  this.setStatusBar();
};

SmartMeteoStation.prototype.onWebsocketClose = function () {
  this.setStatusBar();
};

SmartMeteoStation.prototype.setStatusBar = function () {
  if (!this.lcdReady) {
    return;
  }

  this.clearArea(110, 0, 128, 11);

  const radius = 2;

  if (this.connected) {
    this.lcd.fillCircle(110 + radius, radius, radius);
  } else {
    this.lcd.drawCircle(110 + radius, radius, radius);
  }

  if (this.registered) {
    this.lcd.fillCircle(120 + radius, radius, radius);
  } else {
    this.lcd.drawCircle(120 + radius, radius, radius);
  }

  this.flip();
};

SmartMeteoStation.prototype.setTitle = function (newTitle) {
  if (!this.lcdReady) {
    return;
  }

  this.clearArea(0, 0, 109, 11);

  const title = newTitle.slice(0, 32);

  this.lcd.setFont6x8();
  this.lcd.drawString(title, 0, 2);

  this.flip();
}

SmartMeteoStation.prototype.setTabs = function () {
  if (!this.lcdReady) {
    return;
  }

  this.clearArea(120, 12, 128, 64);

  const tabsLength = this.tabs.length;
  // const height = 64 - 12; // 52 pixels
  const radius = 3;
  const gap = 2;

  for (let i = 0; i < tabsLength; i++) {
    if (i === this.selectedTab) {
      this.lcd.fillCircle(121 + radius, 12 + radius + radius * 2 * i + gap * i, radius);
    } else {
      this.lcd.drawCircle(121 + radius, 12 + radius + radius * 2 * i + gap * i, radius);
    }
  }

  // TODO: drawCircle, fillCircle, align vertically by center
}

SmartMeteoStation.prototype.changeTab = function () {
  const selectedTab = this.tabs[this.selectedTab];

  this.setTabs();
  this.setTitle(selectedTab.title || "Loading");
  this.updateTemperature();
}

SmartMeteoStation.prototype.clearArea = function (x1, y1, x2, y2) {
  if (!this.lcd) {
    return;
  }

  this.lcd.setColor(0, 0, 0);
  this.lcd.fillRect(x1, y1, x2, y2);
  this.lcd.setColor(1, 1, 1);
};

SmartMeteoStation.prototype.getForecast = function () {
  const selectedTab = this.tabs[this.selectedTab];

  if (selectedTab.type !== "forecast") {
    return;
  }

  if (!this.connected) {
    return;
  }

  const cityId = selectedTab.cityId;

  if (selectedTab.temperature) {
    this.renderForecast();
  }

  if (new Date().getTime() - selectedTab.timestamp < 60000) {
    return;
  }

  this.sendAPIRequest('makeHTTPCall', {
    method: 'get',
    url: 'https://api.openweathermap.org/data/2.5/weather',
    params: {
      id: cityId,
      appId: this.apiKey
    }
  })
    .then(forecast => {
      this.tabs[this.selectedTab] = {
        type: "forecast",
        cityId: cityId,
        title: forecast.name,
        weather: forecast.weather && forecast.weather.length && forecast.weather[0].description || forecast.weather[0].main,
        temperature: Math.round(forecast.main.temp - 273.15),
        humidity: forecast.main.humidity,
        timestamp: new Date().getTime()
      }

      this.setTitle(forecast.name);
      this.renderForecast();
    })
    .catch(error => console.log('Error: ' + error.message));
};

SmartMeteoStation.prototype.onButtonPress = function () {
  console.log("Button pressed!");

  if (this.screenIsOff) {
    this.LCDOn();
    return;
  } else {
    this.LCDOn();
  }

  this.selectedTab += 1;

  if (this.selectedTab >= this.tabs.length) {
    this.selectedTab = 0;
  }

  this.changeTab();
}

SmartMeteoStation.prototype.updateTemperature = function () {
  const selectedTab = this.tabs[this.selectedTab];

  if (selectedTab.type === "indoor") {
    this.renderIndoorTemperature();
  } else {
    this.getForecast();
  }
}

SmartMeteoStation.prototype.renderIndoorTemperature = function() {
  if (!this.lcdReady) {
    return;
  }

  this.clearArea(0, 12, 119, 64);

  const temperature = this.data.temperature.toFixed(1);
  const humidity = this.data.humidity.toFixed(1);
  const heatIndex = this.data.heatIndex.toFixed(1);

  this.lcd.setFontVector(30);
  const temperatureWidth = this.lcd.stringWidth(temperature);
  this.lcd.drawString(temperature, 0, 12);
  this.lcd.drawCircle(temperatureWidth + 6, 16, 3);
  this.lcd.drawString('C', temperatureWidth + 10, 12);
  this.lcd.setFont6x8();
  this.lcd.drawString(humidity + '% RH', 0, 45);
  this.lcd.drawString(heatIndex + " HI", 0, 54);

  this.flip();
}

SmartMeteoStation.prototype.renderForecast = function () {
  if (!this.lcdReady) {
    return;
  }

  const city = this.tabs[this.selectedTab];

  this.clearArea(0, 12, 119, 64);

  this.lcd.setFontVector(30);
  const temperatureWidth = this.lcd.stringWidth(city.temperature);
  this.lcd.drawString(city.temperature, 0, 12);
  this.lcd.drawCircle(temperatureWidth + 6, 16, 3);
  this.lcd.drawString('C', temperatureWidth + 10, 12);
  this.lcd.setFont6x8();
  this.lcd.drawString(city.humidity + '% RH', 0, 45);
  this.lcd.drawString(city.weather, 0, 54);

  this.flip();
};

SmartMeteoStation.prototype.process = function () {
  if (this.tabs[this.selectedTab] === "indoor") {
    this.renderIndoorTemperature();
  }
}

exports = SmartMeteoStation;
