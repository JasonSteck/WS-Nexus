const IndexedList = require('./utils/indexed-list');

class Host {
  // options: { hostID, hostName, onClose }
  constructor(ws, options) {
    this.ws = ws;
    this.options = options;
    this.hostID = options.hostID;
    this.hostName = options.hostName;

    ws.on('message', this.onMessage.bind(this));
    ws.on('close', this.onClose.bind(this));

    this.clients = new IndexedList;
    this.nextClientID = 1; // not an array position

    this.ws.send(JSON.stringify({
      type: 'REGISTERED',
      hostID: this.hostID,
      hostName: this.hostName,
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

  onClose() {
    log('* Lost Host Connection');
    this.options.onClose(this);
  }

  _onSend(req) {
    let {clientIDs, message} = req;
    if (clientIDs == null) {
      this.clients.array.forEach(client=>{
        client.ws.send(message);
      }
      )
    } else if (Array.isArray(clientIDs)) {
      clientIDs.forEach(id=>{
        const client = this.clients.hash[id];
        if (client) {
          client.ws.send(message);
        }
      }
      );
    } else {
      const client = this.clients.hash[clientIDs];
      if (client) {
        client.ws.send(message);
      }
    }
  }
}

module.exports = Host;
