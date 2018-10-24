const WebSocket = require('ws');

const pid = '0002';
const vid = '0001';
const sno = '00000002';

let data = this.data = {
  enabled: false,
  color: '#ffffff',
  intensity: 70
};

let ws;

function establishConnection() {
  if (ws) {
    ws = null;
  }

  ws = new WebSocket('ws://localhost:8080', {
    headers: {pid, vid, sno}
  });

  ws.on('open', () => {
    console.log('Switch connected!');
  });

  ws.on('message', packet => {
    const message = JSON.parse(packet);
    console.log('Websocket message', message);

    switch(message.type) {
      case 'get':
        data = new Date().getTime();
        console.log('Send data to hub', data, message.uuid);
        sendData(data, message.uuid);
        break;
      case 'send':
        console.log('Got data from hub', message);
        setData(message.data);
        break;
      case 'signal':
        console.log('Got signal from hub', message.signal);
        sendMessage({type: 'signal', signal: message.signal});
        break;
      default:
        console.log('Unhandled message', message);
    }
  });

  ws.on('close', (code) => {
    console.error('Websocket connection close', code);

    setTimeout(establishConnection, 5000);
  });

  ws.on('error', (error) => {
    console.error('Websocket connection error', error);

    setTimeout(establishConnection, 5000);
  });
}

establishConnection();

function sendMessage(message) {
  const packet = JSON.stringify(message);

  if (ws && ws.OPEN) {
    ws.send(packet);
  }
}

function sendData(data, uuid) {
  sendMessage({ type: 'data', data, uuid });
}

function sendSignal(key, value) {
  sendMessage({ type: 'signal', signal: {[key]: value} });
}

function setData(newData) {
  data = newData;
}
