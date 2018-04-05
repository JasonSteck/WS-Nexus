console.clear();

const WebSocket = require('ws');

const port = 3000;

let SHOW_DEBUG_MESSAGES = true;
const log = (...args) => {
  if(SHOW_DEBUG_MESSAGES) {
    console.log(...args);
  }
}

const VISITOR = null;
const CLIENT = 1;
const HOST = 2;

const state = {
  connPool: new ConnectionPool(),
}

// ======================================================= //

function ConnectionPool() {
  this.hosts = [];
  this.nextHostID = 1; // not an index for array
}

ConnectionPool.prototype.addHost = function(conn) {
  this.hosts.push(conn);
  return this.nextHostID++;
}

ConnectionPool.prototype.getDisplayList = function() {
  return this.hosts.map(h => ({ hostID: h.hostID, hostName: h.hostName }));
}

// ======================================================= //

function Connection(state, ws) {
  this.state = state;
  this.ws = ws;
  this.type = VISITOR;
  this._handleMessage = this._onVisitorMessage;
  this.hostID;
}

Connection.prototype.onMessage = function(str) {
  this._handleMessage(str);
}

Connection.prototype._onVisitorMessage = function(str) {
  const req = JSON.parse(str);
  switch(req.type) {
    case 'HOST': //props: hostName
      this.type = HOST;
      this._handleMessage = this._onHostMessage;
      this.hostID = this.state.connPool.addHost(this);
      this.hostName = req.hostName;
      this.ws.send(JSON.stringify({
        type: 'REGISTERED',
        hostID: this.hostID,
        hostName: this.hostName,
      }));
      break;
    case 'LIST':
      this.ws.send(JSON.stringify({
        type: 'LIST',
        payload: this.state.connPool.getDisplayList(),
      }));
      break;
    default:
      log('Unknown request type:', req.type, 'for:', req);
  }
}

Connection.prototype._onHostMessage = function(str) {}

// ======================== Main ======================== //
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
      log('* Lost Connection');
      // handleClose();
    });
  } catch(e) {
    log('ERROR on connection:\n',e);
  }
});
} catch(e) {
  log('ERROR listening for connections:\n', e);
}
