class NexusSpecHelpers {

  // ===================== Host Helpers ===================== //

  newHost({ nexusServer, hostName, disableDefaultCallbacks = true }={}) {
    this.host = new nexusHost(
      nexusServer || ServerAddr,
      hostName || this.hostName,
      disableDefaultCallbacks,
    );
    return this.host;
  }

  onRegistered(host = this.host) {
    return new Promise(resolve => host.onRegistered = resolve);
  }

  // ==================== Client Helpers ==================== //

  newClient({ nexusServer, autoConnectOptions }={}) {
    this.client = new nexusClient(
      nexusServer || ServerAddr,
      autoConnectOptions || null,
    );
    return this.client;
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
