const WebSocket = require('ws');
const Connection = require('./connection.js');
const ConnectionPool = require('./connection-pool.js');
const port = 3000;

// ======================== Main ======================== //

class Server {
  constructor() {
    this.connPool = new ConnectionPool();
  }

  start() {
    const wss = new WebSocket.Server({ port: port });

    log('Listening on port %d...', port);

    try {
    wss.on('connection', ws => {
      try {
        log('New Connection');

        const conn = new Connection(this, ws);

        ws.on('message', msg => {
          log('Received: %s', msg);

          try {
            conn.onMessage(msg);
          } catch (e) {
            log('ERROR onMessage: ',e,'\n- Trying to Process: `'+msg+'`');
          }
        });

        ws.on('close', () => {
          global.a = 'hi my love!';

          log('* Lost Connection');
          this.connPool.removeHost(conn);
        });
      } catch(e) {
        log('ERROR on connection:\n',e);
      }
    });
    } catch(e) {
      log('ERROR listening for connections:\n', e);
    }
  }
}

module.exports = { Server };
