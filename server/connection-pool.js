const Connection = require('./connection');
const Host = require('./host');

class ConnectionPool {
  constructor() {
    this.hosts = [];
    this.nextHostID = 1; // not an index for array

    this.getDisplayList = this.getDisplayList.bind(this);
    this.onConnectRequest = this.onConnectRequest.bind(this);
    this.onLostHost = this.onLostHost.bind(this);
    this.onNewHost = this.onNewHost.bind(this);
  }

  newConnection(ws) {
    new Connection(ws, {
      getDisplayList: this.getDisplayList,
      onConnectRequest: this.onConnectRequest,
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

  onLostHost(host) {
    const index = this.hosts.indexOf(host);
    if(index >= 0) {
      this.hosts.splice(index, 1);
    }
  }

  onNewHost(connection, { ws, request }) {
    this.hosts.push(new Host(ws, {
      hostID: this.nextHostID++,
      hostName: request.hostName,
      onClose: this.onLostHost,
    }));
  }
}

module.exports = ConnectionPool;
