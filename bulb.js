const WebSocket = require('ws');

const pid = '0001';
const vid = '0001';
const sno = '00000001';
const reconnectInterval = 5000;

let data = {
  enabled: false,
  color: 'white',
  brightness: 70
};

let ws = null;

function establishConnection() {
  if (ws) {
    ws = null;
  }

  ws = new WebSocket('ws://localhost:8080', {
    headers: {pid, vid, sno}
  });

  ws.on('open', () => {
    console.log('Bulb connected!');
  });

  ws.on('message', packet => {
    processMessage(packet);
  });

  ws.on('close', (code) => {
    console.error('Websocket connection close', code);

    reconnect();
  });

  ws.on('error', (error) => {
    console.error('Websocket connection error', error);

    reconnect();
  });
}

establishConnection();

function reconnect() {
  setTimeout(establishConnection, reconnectInterval);
}

function processMessage(packet) {
  const message = JSON.parse(packet);
  console.log('Websocket message', message);

  switch(message.type) {
    case 'get':
      console.log('Send data to hub', data, message.uuid);
      sendData(data, message.uuid);
      break;
    case 'send':
      console.log('Got data from hub', message);
      setData(message.data);
      break;
    default:
      console.log('Unhandled message', message);
  }
}

function sendMessage(message) {
  const packet = JSON.stringify(message);

  if (ws && ws.OPEN) {
    ws.send(packet);
  }
}

function sendData(data, uuid) {
  sendMessage({ type: 'data', data, uuid });
}

function setData(newData) {
  data = Object.assign({}, data, newData);
}
