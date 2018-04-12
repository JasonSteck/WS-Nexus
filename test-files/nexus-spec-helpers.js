const defaultNexusServer = 'ws://localhost:3000';

const getUniqueId = (function() {
  let id = 0;
  return function() {
    // provides a unique id even if called twice in a row
    return `${Date.now()}.${id++}`;
  }
})();

function timebox(desc, func, ms=1000) {
  const error = new Error('timeout while `' + desc + '`');
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { throw  error}, ms);
    return func(val => {
      clearTimeout(timeout);
      return resolve(val);
    }, err => {
      clearTimeout(timeout);
      return reject(err);
    })
  });
}

class HostWrapper {
  constructor(opts={}) {
    const defaults = {
      disableDefaultCallbacks: true,
      hostName: getUniqueId(),
      nexusServer: defaultNexusServer,
    }
    const options = { ...defaults, ...opts}

    this.host = new nexusHost(
      options.nexusServer,
      options.hostName,
      options.disableDefaultCallbacks,
    );
  }

  get id(){
    return this.host.id;
  }

  get name() {
    return this.host.name;
  }

  onRegistered() {
    return timebox(
      `waiting for host '${this.host.name}' to register`,
      resolve => this.host.onRegistered = resolve,
    );
  }

  close() {
    return timebox(
      `waiting to close host '${this.host.name}'`,
      resolve => {
        this.host.onClose = resolve
        this.host.close();
      },
    )
  }
}

class ClientWrapper {
  constructor(opts={}) {
    this.client = new nexusClient(
      opts.nexusServer || defaultNexusServer,
      opts.autoConnectOptions || null,
    );
  }

  onServerConnect() {
    return timebox(
      `waiting for client to connect to server`,
      resolve => this.client.onServerConnect = resolve,
    );
  }

  getHostList() {
    return new Promise(resolve => this.client.getHostList(resolve));
  }

  close() {
    return timebox(
      `waiting to close client`,
      resolve => {
        this.client.onClose = resolve;
        this.client.close();
      },
    )
  }
}

class NexusSpecHelpers {
  // ===================== Spec Helpers ===================== //

  findHost(hostList, id) {
    // hostList := [ host, host, ...]
    // host := { hostID: integer, hostName: string}
    return hostList.find(host => host.hostID == id);
  }

  expectHostToBeListed(host, hostList) {
    let hostRegistry = this.findHost(hostList, host.id);
    expect(hostRegistry && hostRegistry.hostName).toBe(host.name);
  }

  expectHostNotToBeListed(host, hostList) {
    let hostRegistry = this.findHost(hostList, host.id);
    expect(hostRegistry).toBe(undefined);
  }

  newHost(opts={}) {
    return this.host = new HostWrapper(opts);
  }

  newClient(opts={}) {
    return this.client = new ClientWrapper(opts);
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
