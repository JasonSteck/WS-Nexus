class Host {
  // options: { onClose, hostID, hostName }
  constructor(ws, options) {
    this.ws = ws;
    this.options = options;

    ws.on('message', this.onMessage.bind(this));
    ws.on('close', this.onClose.bind(this));

    this.clients = new ClientList;
    this.nextClientID = 1;
    // not an array position

    this.hostID = options.hostID;
    this.hostName = options.hostName;

    this.ws.send(JSON.stringify({
      type: 'REGISTERED',
      hostID: this.hostID,
      hostName: this.hostName,
    }));
  }

  onMessage(str) {
    try {
      log('+ request from Host:', str);
      const req = JSON.parse(str);
      switch (req.type) {
      case 'SEND':
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
    if (index >= 0) {
      this.array = this.array.slice().splice(index, 1);
    }
  }
}

module.exports = Host;
