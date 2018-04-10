class ConnectionPool {
  constructor() {
    this.hosts = [];
    this.nextHostID = 1; // not an index for array
  }

  addHost(conn) {
    this.hosts.push(conn);
    return this.nextHostID++;
  }

  removeHost(conn) {
    this.hosts.splice(this.hosts.indexOf(conn), 1);
  }

  getDisplayList() {
    return this.hosts.map(h => ({ hostID: h.hostID, hostName: h.hostName }));
  }
}

module.exports = ConnectionPool;
