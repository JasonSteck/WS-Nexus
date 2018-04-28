class Connection {
  constructor(ws, { addHost, getDisplayList, onConnectRequest }) {
    this.ws = ws;
    this.addHost = addHost;
    this.getDisplayList = getDisplayList;
    this.onConnectRequest = onConnectRequest;
    this.type = this.VISITOR;
    this._handleMessage = this._onVisitorMessage;

    this.clients = [];
    this.nextClientID = 1; // not an array position

    this.hostID;
    this.hostName;
  }

  onMessage(str) {
    this._handleMessage(str);
  }

  _onVisitorMessage(str) {
    const req = JSON.parse(str);
    switch(req.type) {
      case 'CONNECT': //props: hostName AND/OR hostID AND/OR <anything>
        const host = this.onConnectRequest(req);
        if(host==null) {
          this.ws.send(JSON.stringify({
            type: 'NO_SUCH_HOST',
            request: req,
          }));
        } else {
          this.hostID = host.hostID;
          this.hostName = host.hostName;

          host.newClient(this, req);

          this.ws.send(JSON.stringify({
            type: 'CONNECTED',
            request: req,
          }));
        }
        break;
      case 'HOST': //props: hostName
        this.type = this.HOST;
        this._handleMessage = this._onHostMessage;
        this.hostID = this.addHost(this);
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
          payload: this.getDisplayList(),
        }));
        break;
      default:
        log('Unknown request type:', req.type, 'for:', req);
    }
  }

  _onHostMessage(str) {
    const req = JSON.parse(str);
    console.log('+ message from Host:', str);
    switch(req.type) {
      
    }
  }

  newClient(clientConnection, req) {
    this.clients.push(clientConnection);
    const clientID = this.nextClientID++;

    this.ws.send(JSON.stringify({
      type: 'NEW_CLIENT',
      clientID,
      request: req,
    }));
  }

  _onClientMessage(str) {
    const req = JSON.parse(str);
    console.log('+ message from Client:', str);
    switch(req.type) {
      
    }
  }
}


Connection.VISITOR = null;
Connection.CLIENT = 1;
Connection.HOST = 2;

module.exports = Connection;
