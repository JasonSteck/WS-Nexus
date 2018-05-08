const Connection = require('./connection');

class ConnectionPool {
  constructor() {
    this.hosts = [];
    this.nextHostID = 1; // not an index for array

    this.getDisplayList = this.getDisplayList.bind(this);
    this.onConnectRequest = this.onConnectRequest.bind(this);
    this.onNewHost = this.onNewHost.bind(this);
  }

  newConnection(ws) {
    const con = new Connection(ws, {
      getDisplayList: this.getDisplayList,
      onConnectRequest: this.onConnectRequest,
      onLostHost: () => this.onLostHost(con),
      onNewHost: this.onNewHost,
    });
  }

  // ========================== Callbacks ==========================

  getDisplayList() {
    return this.hosts.map(h => ({
      hostID: h.hostID,
      hostName: h.hostName,
    }));
  }

  onConnectRequest(req) {
    return this.hosts.find(h => (
      req.hostID === h.hostID || req.hostName === h.hostName
    )) || null;
  }

  onLostHost(con) {
    const index = this.hosts.indexOf(con);
    if(index >= 0) {
      this.hosts.splice(index, 1);
    }
  }

  onNewHost(con) {
    this.hosts.push(con);
    return this.nextHostID++;
  }
}

module.exports = ConnectionPool;
