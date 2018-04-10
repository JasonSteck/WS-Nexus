const WebSocket = require('ws');
const Connection = require('./connection.js');
const ConnectionPool = require('./connection-pool.js');
const port = 3000;

let SHOW_DEBUG_MESSAGES = true;
const log = (...args) => {
  if(SHOW_DEBUG_MESSAGES) {
    console.log(...args);
  }
}

// ======================== Main ======================== //

function startServer() {
  const state = {
    connPool: new ConnectionPool(),
  }

  const wss = new WebSocket.Server({ port: port });

  console.log('Listening on port %d...', port);

  try {
  wss.on('connection', function connection(ws) {
    try {
      log('New Connection');

      const conn = new Connection(state, ws);

      ws.on('message', function incoming(msg) {
        log('Received: %s', msg);

        try {
          conn.onMessage(msg);
        } catch (e) {
          log('ERROR onMessage: ',e,'\n- Trying to Process: `'+msg+'`');
        }
      });

      ws.on('close', function() {
        global.a = 'hi my love!';

        log('* Lost Connection');
        state.connPool.removeHost(conn);
      });
    } catch(e) {
      log('ERROR on connection:\n',e);
    }
  });
  } catch(e) {
    log('ERROR listening for connections:\n', e);
  }
}

module.exports = { startServer };
