const IndexedList = require('./utils/indexed-list');

class Host {
  // options: { id, name, onClose }
  constructor(ws, options) {
    this.ws = ws;
    this.options = options;
    this.publicData = {
      id: options.id,
      name: options.name,
    }

    ws.on('message', this.onMessage.bind(this));
    ws.on('close', this.onClose.bind(this));

    this.clients = new IndexedList;
    this.nextClientID = 1; // not an array position

    this.ws.send(JSON.stringify({
      type: 'REGISTERED',
      id: this.publicData.id,
      name: this.publicData.name,
    }));
  }

  newClient(clientConnection, req) {
    const clientID = this.nextClientID++;
    clientConnection.setID(clientID);
    this.clients.add(clientID, clientConnection);

    this.ws.send(JSON.stringify({
      type: 'NEW_CLIENT',
      clientID,
      request: req,
    }));
  }

  clientLost(clientID) {
    this.clients.remove(clientID);
    if(this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'LOST_CLIENT',
        clientID,
      }));
    }
  }

  onMessage(str) {
    try {
      log('+ request from Host:', str);
      const req = JSON.parse(str);
      switch (req.type) {
      case 'SEND':
        this._onSend(req);
        break;
      default:
        log('! Unknown request from a host:', str);
      }
    } catch (e) {
      log('ERROR host onMessage: ', e, '\n- Trying to Process: `' + str + '`');
    }
  }

  onClose(code) {
    log('host onClose: ', ...arguments);
    try {
      this.clients.array.forEach(c => {
        c.close(1001, 'Host was closed');
      })
    } catch(e) {
      log(e);
    }
    this.clients.clear();
    this.options.onClose(this);
    log('* Lost Host Connection');
  }

  _onSend(req) {
    let {clientIDs, message} = req;
    if (clientIDs == null) {
      this.clients.array.forEach(client=>{
        this._sendMessage(client, message);
      });
    } else if (Array.isArray(clientIDs)) {
      clientIDs.forEach(id=>{
        const client = this.clients.hash[id];
        if (client) {
          this._sendMessage(client, message);
        }
      });
    } else {
      const client = this.clients.hash[clientIDs];
      if (client) {
        this._sendMessage(client, message);
      }
    }
  }

  _sendMessage(client, message) {
    client.ws.send(JSON.stringify({
      type: 'MESSAGE',
      message,
    }))
  }
}

module.exports = Host;
