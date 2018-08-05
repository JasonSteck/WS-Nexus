const WebSocket = require('ws');
const ConnectionPool = require('./connection-pool.js');
const janitor = require('./utils/janitor.js');

const apiVersion = '1.1.0';

class Server {
  constructor(port=3000) {
    this.port = port;
    this.conPool = new ConnectionPool();
  }

  start() {
    const wss = new WebSocket.Server({ port: this.port });
    log('Listening on port %d...', this.port);

    try {
      wss.on('connection', ws => {
        janitor(ws);

        ws.on('error', e => log('ws error:\n', e));
        try {
          log('New Connection');
          ws.send(`{"type":"SERVER_INFO","apiVersion":"${apiVersion}"}`);

          this.conPool.newVisitor(ws);
        } catch(e) {
          log('ERROR handling new Visitor:\n', e);
        }
      });
    } catch(e) {
      log('ERROR listening for connections:\n', e);
    }
  }
}

module.exports = { Server };
