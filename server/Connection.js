class Connection {
  // options: { addHost, getDisplayList, onConnectRequest, onClose }
  constructor(ws, options) {
    this.ws = ws;
    this.options = options;
    this.type = this.VISITOR;
    this._handleMessage = this._onVisitorMessage;

    this.clients = new ClientList;
    this.nextClientID = 1; // not an array position

    this.hostID;
    this.hostName;

    this.host;
  }

  onMessage(str) {
    log('Received: %s', str);
    try {
      this._handleMessage(str);
    } catch (e) {
      log('ERROR onMessage: ',e,'\n- Trying to Process: `'+str+'`');
    }
  }

  onClose() {
    log('* Lost Connection');
    this.options.onClose();
  }

  _onVisitorMessage(str) {
    const req = JSON.parse(str);
    switch(req.type) {
      case 'CONNECT': //props: hostName AND/OR hostID AND/OR <anything>
        this.host = this.options.onConnectRequest(req);
        if(this.host==null) {
          this.ws.send(JSON.stringify({
            type: 'NO_SUCH_HOST',
            request: req,
          }));
        } else {
          this.host.newClient(this, req);

          this._handleMessage = this._onClientMessage;

          this.ws.send(JSON.stringify({
            type: 'CONNECTED',
            hostID: this.host.hostID,
            hostName: this.host.hostName,
            request: req,
          }));
        }
        break;
      case 'HOST': //props: hostName
        this.type = this.HOST;
        this._handleMessage = this._onHostMessage;
        this.hostID = this.options.addHost(this);
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
          payload: this.options.getDisplayList(),
        }));
        break;
      default:
        log('Unknown request type:', req.type, 'for:', req);
    }
  }

  _onHostMessage(str) {
    const req = JSON.parse(str);
    log('+ request from Host:', str);
    switch(req.type) {
      case 'SEND':
        let { clientIDs, message } = req;
        if(Array.isArray(clientIDs)) {
          clientIDs.forEach(id => {
            const client = this.clients.hash[id];
            if(client) {
              client.ws.send(message);
            }
          });
        } else {
          const client = this.clients.hash[clientIDs];
          if(client) {
            client.ws.send(message);
          }
        }
        break;
      default:
        log('! Unknown request from a host:', str);
    }
  }

  newClient(clientConnection, req) {
    const clientID = this.nextClientID++;
    clientConnection.setID(clientID);
    this.clients.addClient(clientConnection);

    this.ws.send(JSON.stringify({
      type: 'NEW_CLIENT',
      clientID,
      request: req,
    }));
  }

  _onClientMessage(str) {
    log('+ request from Client:', str);
    this.host.ws.send(JSON.stringify({
      type: 'FROM_CLIENT',
      clientID: this.clientID,
      message: str,
    }));
  }

  setID(clientID) {
    this.clientID = clientID;
  }
}

class ClientList {
  constructor() {
    this.hash = {};
    this.array = [];
  }

  addClient(client) {
    this.hash[client.clientID] = client;
    this.array.push(client);
  }

  removeClient(client) {
    delete this.hash[client.clientID];
    const index = this.array.indexOf(client);
    if(index >= 0) {
      this.array = this.array.slice().splice(index, 1);
    }
  }
}


Connection.VISITOR = null;
Connection.CLIENT = 1;
Connection.HOST = 2;

module.exports = Connection;
