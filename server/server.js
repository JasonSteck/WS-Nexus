const WebSocket = require('ws');
const ConnectionPool = require('./connection-pool.js');
const port = 3000;

class Server {
  constructor() {
    this.conPool = new ConnectionPool();
  }

  start() {
    const wss = new WebSocket.Server({ port: port });

    log('Listening on port %d...', port);

    try {
    wss.on('connection', ws => {
      try {
        log('New Connection');

        const con = this.conPool.newConnection(ws);

        ws.on('message', msg => {
          log('Received: %s', msg);

          try {
            con.onMessage(msg);
          } catch (e) {
            log('ERROR onMessage: ',e,'\n- Trying to Process: `'+msg+'`');
          }
        });

        ws.on('close', () => {
          log('* Lost Connection');
          this.conPool.removeHost(con);
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
