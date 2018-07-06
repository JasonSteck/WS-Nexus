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
          this.conPool.newVisitor(ws);
        } catch(e) {
          log('ERROR handling new Visitor:\n',e);
        }
      });
    } catch(e) {
      log('ERROR listening for connections:\n', e);
    }

    wss.on('error', e => log('Wss error:\n', e));
  }
}

module.exports = { Server };
