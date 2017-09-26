const WebSocket = require('ws');

const port = 3000;

let SHOW_DEBUG_MESSAGES = true;
const d = (...args) => {
  if(SHOW_DEBUG_MESSAGES) {
    console.log.apply(console, args);
  }
}

const wss = new WebSocket.Server({ port: port });

d('Listening on port %d...', port);

wss.on('connection', function connection(ws) {
  d('Connection Established');
});
