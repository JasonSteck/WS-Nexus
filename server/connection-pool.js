const Client = require('./client');
const Visitor = require('./visitor');
const Host = require('./host');

class ConnectionPool {
  constructor() {
    this.hosts = [];
    this.nextHostID = 1; // not an index for array

    this.getDisplayList = this.getDisplayList.bind(this);
    this._onLostHost = this._onLostHost.bind(this);
    this._onBecomeClient = this._onBecomeClient.bind(this);
    this._onBecomeHost = this._onBecomeHost.bind(this);
  }

  findHost(req) {
    return this.hosts.find(h => {
      const keys = Object.keys(req);
      // Everything in the request must match the host
      for(let i=0; i<keys.length; i++) {
        const key = keys[i];
        const mismatch = (key in h.publicData) && req[key] !== h.publicData[key];
        if(mismatch) return false;
      }

      if(h.clients.array.length >= h.publicData.maxClients) {
        return false;
      }

      return h;
    }) || null;
  }

  newVisitor(ws) {
    new Visitor(ws, {
      getDisplayList: this.getDisplayList,
      onBecomeClient: this._onBecomeClient,
      onBecomeHost: this._onBecomeHost,
    });
  }

  getDisplayList() {
    return this.hosts.map(h => h.publicData);
  }

  _onBecomeClient(connection, { ws, request }) {
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

  _onBecomeHost({ ws, request }) {
    this.hosts.push(new Host(ws, {
      id: this.nextHostID++,
      onClose: this._onLostHost,
      request,

      name: request.name,
      maxClients: request.maxClients,
      status: request.status,
    }));
  }

  _onLostHost(host) {
    const index = this.hosts.indexOf(host);
    if(index >= 0) {
      this.hosts.splice(index, 1);
    }
  }
}

module.exports = ConnectionPool;
