const SmartDevice = require('SmartDevice');
const LCD = require("HD44780");

const vid = '0001';
const pid = '0008';

function Encoder( pina, pinb , callback ) {
  const onChange = function() {
    const a = digitalRead(pina);
    const b = digitalRead(pinb);
    if (this.lastA !== this.lastB && a === b ) {
      callback( (a === this.lastA) ? 1 : -1);
    }
    this.lastA = a;
    this.lastB = b;
  };

  pinMode(pina, "input_pulldown");
  pinMode(pinb, "input_pulldown");
  onChange(); // remember pin state but no callback
  setWatch(onChange, pina, { repeat: true });
  setWatch(onChange, pinb, { repeat: true });
}

function SmartControlPanel(params) {
  SmartDevice.call(this, vid, pid, params);

  this.retries = params.retries || 10;
  this.buttonPin = params.config.button;
  this.encoderPins = params.config.encoder;
  this.lcdPins = params.config.lcd;

  I2C1.setup({sda: this.lcdPins[0], scl: this.lcdPins[1]});
  this.lcd = LCD.connectI2C(I2C1, 0x3F);

  // menu items
  this.title = 'Welcome';
  this.menus = {
    main: {
      id: 1,
      title: 'Main menu',
      items: [
        {
          caption: 'List devices',
          action: 'listDevices'
        },
        {
          caption: 'Reboot',
          action: 'reboot'
        }
      ]
    },
    devices: {
      id: 2,
      title: 'Devices',
      text: 'No devices'
    },
    deviceInfo: {
      id: 3,
      title: 'Device info',
      text: 'No info'
    },
    error: {
      id: 'error',
      title: 'Error',
      text: 'Unknown error'
    }
  };
  this.cursor = 0;
  this.items = [];
  this.returnAction = 'goHome';
  this.currentMenuId = null;

  setWatch(() => this.onClick(), this.buttonPin, { repeat: true, edge: 'rising', debounce: 100 });
  Encoder(this.encoderPins[0], this.encoderPins[1], direction => direction === 1 ? this.onEncoderTop() : this.onEncoderBottom());

  // create custom icons
  this.lcd.createChar(0, [0,0,0,0,0,0,4,0]); // no wifi
  this.lcd.createChar(1, [17,0,4,0,4,0,4,0]); // wifi connecting
  this.lcd.createChar(2, [17,10,4,4,4,4,4,0]); // wifi
  this.lcd.createChar(3, [0,0,0,0,0,0,31,0]); // no ws
  this.lcd.createChar(4, [0,1,1,5,5,21,21,0]); // ws connecting
  this.lcd.createChar(5, [0,1,3,7,15,31,31,0]); // ws
}

SmartControlPanel.prototype = Object.create(SmartDevice.prototype);

SmartControlPanel.prototype.onClick = function() {
  const menuItem = this.items[this.cursor];

  if (!menuItem && this.returnAction) {
    this.executeAction(this.returnAction);
    return;
  }

  this.executeAction(menuItem.action, menuItem.payload);
};

SmartControlPanel.prototype.onEncoderTop = function() {
  this.cursor += 1;
  this.selectMenuItem(this.cursor);
};

SmartControlPanel.prototype.onEncoderBottom = function() {
  this.cursor -= 1;
  this.selectMenuItem(this.cursor);
};

SmartControlPanel.prototype.onStartConnectWifi = function () {
  this.setStatusBar();
  this.writeText('Connecting...');
};

SmartControlPanel.prototype.onWifiConnected = function (wifi) {
  this.setStatusBar();
  this.writeText('Wifi ok!');
};

SmartControlPanel.prototype.onWifiError = function (e) {
  this.setStatusBar();
  this.writeText('Wifi error! ' + e.message);
};

SmartControlPanel.prototype.onStartConnectWebsocket = function () {
  this.setStatusBar();
  this.writeText('Registering...');
};

SmartControlPanel.prototype.onWebsocketConnected = function () {
  this.setStatusBar();
  this.writeText('Websocket ok!');

  this.executeAction('goHome');
};

SmartControlPanel.prototype.writeText = function (text) {
  this.lcd.setCursor(0, 1);
  if (!text) {
    return;
  }
  this.lcd.print(text);
  for (let i = text.length - 1; i < 16; i++) {
    this.lcd.print(' ');
  }
};

SmartControlPanel.prototype.setStatusBar = function () {
  this.lcd.setCursor(0, 0);

  const title = this.title.slice(0, 12);

  this.lcd.print(title);

  for (let i = title.length - 1; i < 12; i++) {
    this.lcd.print(' ');
  }

  this.lcd.print('|');
  if (this.connected) {
    this.lcd.write(2);
  } else {
    this.lcd.write(0);
  }

  if (this.registered) {
    this.lcd.write(5);
  } else {
    this.lcd.write(3);
  }
};

SmartControlPanel.prototype.setMenu = function (menu) {
  if (menu.id && this.currentMenuId && menu.id === this.currentMenuId) {
    return;
  }

  this.currentMenuId = menu.id;
  this.title = menu.title;
  this.setStatusBar();

  if (menu.items) {
    this.items = menu.items;
    this.cursor = 0;
    this.selectMenuItem(this.cursor);
  }

  this.writeText(menu.text);
};

SmartControlPanel.prototype.selectMenuItem = function(index) {
  if (!this.items || !this.items.length) {
    return;
  }

  this.cursor = index;

  if (this.cursor >= this.items.length) {
    this.cursor = 0;
  }

  if (this.cursor < 0) {
    this.cursor = this.items.length - 1;
  }

  this.writeText((this.cursor + 1) + ':' + this.items[this.cursor].caption);
};

SmartControlPanel.prototype.executeAction = function (action, payload) {
  switch (action) {
    case 'reboot':
      ESP32.reboot();
      return;
    case 'goHome':
      const menu = this.menus.main;

      this.setMenu(menu);
      break;
    case 'listDevices':
      this.setMenu(this.menus.devices);
      this.writeText('Loading...');
      this.sendAPIRequest('getDevices')
        .then(response => {
          console.log('getDevices response', response);
          if (!response || !response.devices) {
            this.setMenu({
              id: 'no_devices_error',
              title: 'Error',
              text: 'No devices found'
            });

            return;
          }

          this.items = response.devices.map(device => {
            return {
              caption: device.name,
              action: 'deviceInfo',
              payload: device.uid
            }
          }).concat({
            caption: 'Back',
            action: 'goHome'
          });
          this.cursor = 0;
          this.selectMenuItem(this.cursor);
        })
        .catch(error => {
          this.setMenu({
            id: 'devices_get_error',
            title: 'Error',
            text: error.message
          });
        });
      break;
    case 'deviceInfo':
      this.setMenu(this.menus.deviceInfo);
      this.writeText('Loading...');
      console.log('send getDeviceInfo request', payload);
      this.sendAPIRequest('getDevice', {uid: payload})
        .then(response => {
          console.log('getDeviceInfo response', response);
          if (!response) {
            this.setMenu({
              id: 'no_devices_error',
              title: 'Error',
              text: 'Device not found'
            });

            return;
          }

          this.title = response.name;

          this.items = Object.keys(response.data || {}).map(device => {
            return {
              caption: device + '=' + response.data[device]
            }
          }).concat({
            caption: 'Back',
            action: 'listDevices'
          });
          this.cursor = 0;
          this.selectMenuItem(this.cursor);
        })
        .catch(error => {
          this.setMenu({
            id: 'device_get_error',
            title: 'Error',
            text: error.message
          });
        });
      break;
  }
};

exports = SmartControlPanel;
