class Connection {
  // options: { getDisplayList, onConnectRequest, onNewHost }
  constructor(ws, options) {
    this.ws = ws;
    this.options = options;
    this.type = this.VISITOR;
    this._handleMessage = this._onVisitorMessage;

    this.onMessage = this.onMessage.bind(this);
    this.onClose = this.onClose.bind(this);

    ws.on('message', this.onMessage);
    ws.on('close', this.onClose);

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
    log('* Lost Visitor Connection');
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
        this.ws.removeListener('message', this.onMessage);
        this.ws.removeListener('close', this.onClose);

        this.options.onNewHost(this, {
          ws: this.ws,
          request: req,
        });
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

Connection.VISITOR = null;
Connection.CLIENT = 1;
Connection.HOST = 2;

module.exports = Connection;
