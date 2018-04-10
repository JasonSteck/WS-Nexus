class Connection {
  constructor(state, ws) {
    this.state = state;
    this.ws = ws;
    this.type = this.VISITOR;
    this._handleMessage = this._onVisitorMessage;
    this.hostID;
  }

  onMessage(str) {
    this._handleMessage(str);
  }

  _onVisitorMessage(str) {
    const req = JSON.parse(str);
    switch(req.type) {
      case 'HOST': //props: hostName
        this.type = this.HOST;
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

  _onHostMessage(str) {}
}


Connection.VISITOR = null;
Connection.CLIENT = 1;
Connection.HOST = 2;

module.exports = Connection;
