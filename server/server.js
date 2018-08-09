const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const janitor = require('./utils/janitor.js');
const ConnectionPool = require('./connection-pool.js');

const apiVersion = '1.2.2';
const defaultPort = 34777;

class Server {
  constructor(params) {
    this.port = params.port || defaultPort;
    this.usingSSL = !!params.credentials;
    this.server = this._loadServer(params.credentials);
    this.conPool = new ConnectionPool();

    this._processRequest = this._processRequest.bind(this);
  }

  start() {
    const server = this.server;

    server.listen(this.port);
    const wss = new WebSocket.Server({ server });

    log('TLS: %s (Use "%s" for connections)',
      this.usingSSL ? 'Enabled' : 'Disabled',
      this.usingSSL ? 'wss://' : 'ws://',
    );
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

  _loadServer(cred=null) {
    return cred ?
      https.createServer(cred, this._processRequest):
      http.createServer(this._processRequest);
  }

  _processRequest(req, res) {
    res.writeHead(200);
    res.end("WS-Nexus Server online! Please use the `ws://` or `wss://` protocol.\n");
  }
}

module.exports = { Server };
