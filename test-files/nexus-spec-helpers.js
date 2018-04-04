class NexusSpecHelpers {
  // ===================== Spec Helpers ===================== //

  timebox(desc, func, ms=1000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { throw new Error('timeout while: ' + desc); }, ms);
      return func(val => {
        clearTimeout(timeout);
        return resolve(val);
      }, err => {
        clearTimeout(timeout);
        return reject(err);
      })
    });
  }

  findHost(hostList, id) {
    // host := { hostID: integer, hostName: string}
    // hostList := [ host, host, ...]
    return hostList.find(host => host.hostID == id);
  }

  // ===================== Host Helpers ===================== //

  newHost({ nexusServer, hostName, disableDefaultCallbacks = true }={}) {
    this.host = new nexusHost(
      nexusServer || ServerAddr,
      hostName || this.hostName,
      disableDefaultCallbacks,
    );
    return this.host;
  }

  onRegistered({ host = this.host }={}) {
    return this.timebox(
      `waiting for host '${this.host.name}' to register`,
      resolve => host.onRegistered = resolve,
    );
  }

  closeHost({ host = this.host }={}) {
    return this.timebox(
      `waiting to close host '${this.host.name}'`,
      resolve => {
        host.onClose = resolve
        host.close();
      },
    )
  }

  // ==================== Client Helpers ==================== //

  newClient({ nexusServer, autoConnectOptions }={}) {
    this.client = new nexusClient(
      nexusServer || ServerAddr,
      autoConnectOptions || null,
    );
    return this.client;
  }

  onServerConnect({ client = this.client }={}) {
    return this.timebox(
      `waiting for client to connect to server`,
      resolve => client.onServerConnect = resolve,
    );
  }

  getHostList({ client = this.client }={}) {
    return new Promise(resolve => client.getHostList(resolve));
  }

  closeClient({ client = this.client }={}) {
    return this.timebox(
      `waiting to close client`,
      resolve => {
        client.onClose = resolve;
        client.close();
      },
    )
  }
}

class EnsureConnection {
  constructor() {
    this.ws = new WebSocket(ServerAddr);
    this.closed = false;
    this._shouldClose = false;

    this.ws.onclose = () => {
      if(!this._shouldClose) {
        console.warn("No Connection to Nexus Server!");
      }
      this.closed = true;
    }
  }

  close() {
    this._shouldClose = true;
    this.ws.close();
  }
}
