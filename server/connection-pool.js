const Client = require('./client');
const Visitor = require('./visitor');
const Host = require('./host');

class ConnectionPool {
  constructor() {
    this.hosts = [];
    this.nextHostID = 1; // not an index for array

    this.getDisplayList = this.getDisplayList.bind(this);
    this.onLostHost = this.onLostHost.bind(this);
    this.onBecomeClient = this.onBecomeClient.bind(this);
    this.onBecomeHost = this.onBecomeHost.bind(this);
  }

  newVisitor(ws) {
    new Visitor(ws, {
      getDisplayList: this.getDisplayList,
      onBecomeClient: this.onBecomeClient,
      onBecomeHost: this.onBecomeHost,
    });
  }

  findHost(req) {
    return this.hosts.find(h => (
      req.hostID === h.hostID || req.hostName === h.hostName
    )) || null;
  }

  // ========================== Callbacks ==========================

  getDisplayList() {
    return this.hosts.map(h => ({
      hostID: h.hostID,
      hostName: h.hostName,
    }));
  }

  onLostHost(host) {
    const index = this.hosts.indexOf(host);
    if(index >= 0) {
      this.hosts.splice(index, 1);
    }
  }

  onBecomeClient(connection, { ws, request }) {
    const host = this.findHost(request);
    if(host==null) {
      return false;
    } else {
      host.newClient(new Client(ws, {
        request,
        host,
      }), request);
      return true;
    }
  }

  onBecomeHost(connection, { ws, request }) {
    this.hosts.push(new Host(ws, {
      hostID: this.nextHostID++,
      hostName: request.hostName,
      onClose: this.onLostHost,
    }));
  }
}

module.exports = ConnectionPool;
