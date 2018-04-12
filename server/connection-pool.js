const Connection = require('./connection');

class ConnectionPool {
  constructor() {
    this.hosts = [];
    this.nextHostID = 1; // not an index for array

    this.addHost = this.addHost.bind(this);
    this.getDisplayList = this.getDisplayList.bind(this);
  }

  newConnection(ws) {
    return new Connection(ws, {
      addHost: this.addHost,
      getDisplayList: this.getDisplayList,
    })
  }

  addHost(con) {
    this.hosts.push(con);
    return this.nextHostID++;
  }

  removeHost(con) {
    this.hosts.splice(this.hosts.indexOf(con), 1);
  }

  getDisplayList() {
    return this.hosts.map(h => ({ hostID: h.hostID, hostName: h.hostName }));
  }
}

module.exports = ConnectionPool;
