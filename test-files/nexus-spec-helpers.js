(function(){

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
    const timeout = setTimeout(() => { if(ms!=null) reject(error); }, ms);
    return func(val => {
      clearTimeout(timeout);
      return resolve(val);
    }, err => {
      clearTimeout(timeout);
      return reject(err);
    })
  });
}

// ===================== Host Wrapper ===================== //

class HostWrapper {
  constructor(opts={}, testOptions={}) {
    const defaults = {
      disableDefaultCallbacks: true,
      hostName: getUniqueId(),
      nexusServer: defaultNexusServer,
    }

    this.requestTimeout = testOptions.requestTimeout;

    // let any specified property overwrite the default value (including undefined)
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

  close() {
    return timebox(
      `waiting to close host '${this.host.name}'`,
      resolve => {
        this.host.onClose = resolve
        this.host.close();
      },
      this.requestTimeout,
    )
  }

  // Callbacks

  onRegistered() {
    return timebox(
      `waiting for host '${this.host.name}' to register`,
      resolve => this.host.onRegistered = resolve,
      this.requestTimeout,
    );
  }

  onNewClient(req) {
    return timebox(
      `waiting for a client to connect to host`,
      resolve => this.host.onNewClient = resolve,
      this.requestTimeout,
    );
  }
}

// ===================== Client Wrapper ===================== //

class ClientWrapper {
  constructor(opts={}, testOptions={}) {
    this.client = new nexusClient(
      opts.nexusServer || defaultNexusServer,
      opts.autoConnectOptions || null,
    );
    this.requestTimeout = testOptions.requestTimeout;

    this.client.onMessage = function(msg){
      throw new Error("Client got unexpected message: " + msg);
    };
    this.client.onClose = function() {
      throw new Error("Client closed unexpectedly!");
    }
  }

  getHostList() {
    return new Promise(resolve => this.client.getHostList(resolve));
  }

  connect(connectionOptions) {
    return timebox(
      `connecting to host ${JSON.stringify(connectionOptions)}`,
      (resolve, reject) => {
        this.client.onFailHostConnect = reject;
        this.client.connect(connectionOptions, resolve);
      },
      this.requestTimeout,
    );
  }

  failingConnect(connectionOptions) {
    return timebox(
      `waiting to hear that this host doesn't exist: ${JSON.stringify(connectionOptions)}`,
      (resolve, reject) => {
        this.client.onFailHostConnect = resolve;
        this.client.connect(connectionOptions, reject); // if successfully connected, fail test
      },
      this.requestTimeout,
    );
  }

  close() {
    return timebox(
      `waiting to close client`,
      resolve => {
        this.client.onClose = resolve;
        this.client.close();
      },
      this.requestTimeout,
    )
  }

  // Callbacks

  onServerConnect() {
    return timebox(
      `waiting for client to connect to server`,
      resolve => this.client.onServerConnect = resolve,
      this.requestTimeout,
    );
  }
}

// ===================== Spec Helpers ===================== //

window.NexusSpecHelpers = class NexusSpecHelpers {
  newHost(opts={}) {
    return this.host = new HostWrapper(opts, {
      requestTimeout: this.requestTimeout,
    });
  }

  newClient(opts={}) {
    return this.client = new ClientWrapper(opts, {
      requestTimeout: this.requestTimeout,
    });
  }

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
}

window.EnsureConnection = class EnsureConnection {
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

})();
