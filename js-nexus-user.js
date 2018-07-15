window.JSNexusUser = window.Nexus = (function() {

// Experiment with morphing the current instance.
const NexusTypes = {
  Client: {},

  Host: {
    id: null,
    name: null,
  },

  User: {
    host(hostType) {
      let req;
      switch(typeof hostType) {
        case 'string':
          req = { hostName: hostType };
          break;
        case 'number':
          req = { hostID: hostType };
          break;
        case 'object':
          req = hostType;
          break;
        default:
          throw new Error('Invalid hostType:', hostType);
      }
      req.type = 'HOST';
      this.serverConnection.then(()=>this._ws.send(JSON.stringify(req)));
      this._changeType('Host');
      this._setThen(this.hostConnection);
      return this;
    },
    client(hostType) {
      this._changeType('Client');
      return this;
    }
  },
}

class NexusBase {
  constructor(nexusServerAddress) {
    this._type = null;
    this.nexusServerAddress = nexusServerAddress;

    this.serverConnection = promise();
    this.lostServerConnection = promise();
    this.hostConnection = promise();

    this.onList = createPromiseEventListener();

    this._ws = new WebSocket(nexusServerAddress);
    this._ws.onmessage = this._onServerMessage.bind(this);
    this._ws.onopen = this.serverConnection.resolve;
    this._ws.onclose = this.lostServerConnection.resolve;

    this._setThen(this.serverConnection);
    this._changeType('User');
  }

  get type() {
    return this._type;
  }

  getHosts() {
    this._ws.send('{"type":"LIST"}');
    return this.onList;
  }

  close(code=1000, reason="User closed their connection") {
    this._ws.close(code, reason);
    return this.lostServerConnection;
  }

  _onServerMessage(e) {
    const json = JSON.parse(e.data);

    switch(json.type) {
      case 'LIST':
        this.onList.trigger(json.payload);
        break;
      case 'REGISTERED':
        this.id = json.hostID;
        this.name = json.hostName;
        this.hostConnection.resolve(json);
        break;
      default:
        console.log('(ignorning message:', json);
    }
  }

  // Allow .then/await to be used on an instance of this class
  _setThen(promise) {
    this.then = resolve => {
      promise.then(()=>{
        this.then = undefined; // prevent infinite cycle when awaiting this thenable object that returns this same object
        resolve(this);
      });
      return this;
    }
  }

  // Modifies the properties on this object to make it a different "type"
  _changeType(to) {
    removeType(this, this.type);
    addType(this, to);
  }
}

// ========================================= Helpers ========================================= //

function removeType(obj, typeName) {
  if(typeName) {
    if(obj._type !== typeName) {
      throw new Error(`Cannot remove type "${typeName}" when object has type "${obj._type}"`);
    }
    if(!(typeName in NexusTypes)) {
      throw new Error('Invalid typeName when removing type:', typeName);
    }
    obj._typeProps.forEach(prop => delete obj[prop]);
    delete obj._typeProps;
    obj._type = null;
  } else if(typeName === undefined) {
    throw new Error('Cannot remove type on object with undefined type (double check the correct object is passed and it has `._type` set as null or a valid type)');
  }
}

function addType(obj, typeName) {
  if(!(typeName in NexusTypes)) {
    throw new Error('Invalid typeName when adding type:', typeName);
  }

  const props = NexusTypes[typeName];
  Object.assign(obj, props);
  obj._typeProps = Object.keys(props);
  obj._type = typeName;
}

function promise(resolver=()=>{}) {
  let resolve;
  let reject;
  const promise = new Promise((res, rej)=>resolver(resolve = res, reject = rej));
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
}

function createPromiseEventListener() {
  let anyNonce = false;
  let listeners = [];

  function promiseEventListener(callback, name) {
    listeners.push(callback);
    return promiseEventListener;
  }

  promiseEventListener.then = function(callback, name) {
    anyNonce = true;
    callback._PromiseEventNonce = true;
    listeners.push(callback);
    return promiseEventListener;
  }

  promiseEventListener.trigger = function(...args) {
    const current = listeners;
    if(anyNonce) {
      // Remove one-time listeners
      listeners = listeners.filter(l => {
        if(!l._PromiseEventNonce) return true;
        delete l._PromiseEventNonce;
      });
      anyNonce = false;
    }
    current.forEach(callback => callback(...args));
  }
  return promiseEventListener;
}

return (serverAddress='ws://127.0.0.1:3000') => new NexusBase(serverAddress);

})();
