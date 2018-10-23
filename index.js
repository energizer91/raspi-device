const WebSocket = require('ws');

const pid = '0001';
const vid = '0001';
const sno = '00000001';

let data = new Date().getTime();
let uid;

let ws;

function establishConnection() {
  ws = new WebSocket('ws://localhost:8080', {
    headers: {pid, vid, sno}
  });
}

establishConnection();

function sendMessage(message) {
  const packet = JSON.stringify(message);

  ws.send(packet);
}

function sendData(data) {
  sendMessage({ type: 'data', data });
}

ws.on('open', () => {
  console.log('Opened!');
});

ws.on('message', packet => {
  const message = JSON.parse(packet);
  console.log('Websocket message', message);

  switch(message.type) {
    case 'success':
      console.log('Connection successful', message);
      uid = message.uid;
      break;
    case 'data':
      data = new Date().getTime();
      console.log('Send data to hub', data);
      sendData(data);
      break;
  }
});

ws.on('error', (error) => {
  console.error('Websocket connection error', error);

  setTimeout(() => {
    establishConnection();
  }, 5000);
});