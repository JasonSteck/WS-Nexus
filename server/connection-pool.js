const Connection = require('./connection');

class ConnectionPool {
  constructor() {
    this.hosts = [];
    this.nextHostID = 1; // not an index for array

    this.addHost = this.addHost.bind(this);
    this.getDisplayList = this.getDisplayList.bind(this);
    this.onConnectRequest = this.onConnectRequest.bind(this);
  }

  newConnection(ws) {
    const con = new Connection(ws, {
      addHost: this.addHost,
      getDisplayList: this.getDisplayList,
      onConnectRequest: this.onConnectRequest,
      onClose: () => this.removeHost(con),
    });
  }

  removeHost(con) {
    const index = this.hosts.indexOf(con);
    if(index >= 0) {
      this.hosts.splice(index, 1);
    }
  }

  // ========================== Callbacks ==========================

  addHost(con) {
    this.hosts.push(con);
    return this.nextHostID++;
  }

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
}

module.exports = ConnectionPool;
