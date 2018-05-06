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

  send(msg, clientID=undefined) {
    this.host.send(msg, clientID);
  }

  close() {
    const state = this.host._ws.readyState;
    if(state === WebSocket.CLOSED  || state === WebSocket.CLOSING) return Promise.resolve();
    return timebox(
      `waiting to close host '${this.host.name}'`,
      resolve => {
        this.host.onClose = resolve
        this.host.close();
      },
      this.requestTimeout,
    );
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

  onClientMessage() {
    return timebox(
      `waiting for a client send a message`,
      resolve => this.host.onClientMessage = (message, clientID) => resolve([message, clientID]),
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

  send(msg) {
    this.client.send(msg);
  }

  onMessage(msg) {
    return timebox(
      `waiting for host to send a message`,
      resolve => this.client.onMessage = resolve,
      this.requestTimeout,
    );
  }

  close() {
    const state = this.client._ws.readyState;
    if(state === WebSocket.CLOSED  || state === WebSocket.CLOSING) return Promise.resolve();
    return timebox(
      `waiting to close client`,
      resolve => {
        this.client.onClose = resolve;
        this.client.close();
      },
      this.requestTimeout,
    );
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
  constructor() {
    this.connections = [];
  }

  newHost(opts={}) {
    const host = new HostWrapper(opts, {
      requestTimeout: this.requestTimeout,
    });
    this.connections.push(host);
    return host;
  }

  newClient(opts={}) {
    const client = new ClientWrapper(opts, {
      requestTimeout: this.requestTimeout,
    });
    this.connections.push(client);
    return client;
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
    this._shouldBeOpen = true;

    let connected = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onclose = () => {
        if(this._shouldBeOpen) {
          const err = new Error('no connection');
          reject(err);
          connected = Promise.reject(err); // change to rejected if we lose connection
        }
      }
    });

    beforeEach(async function() {
      await connected;
    });

    onDoneTesting.then(() => this.close());
  }

  close() {
    this._shouldBeOpen = false;
    this.ws.close();
  }
}

})();
