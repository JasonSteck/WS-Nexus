window.JSNexusUser = window.Nexus = (function() {

// Experiment with morphing the current instance.
const NexusTypes = {
Dead: () => ({}),
Client: () => ({
  host: null,
  onMessage: createPromiseEventListener(),
  send(message) {
    this._ws.send(message);
  },
  _onServerMessage(json) {
    switch(json.type) {
      case 'CONNECTED':
        this.host = json.host;
        this.whenJoined.success(this.host);
        break;
      case 'NO_SUCH_HOST':
        this._changeType('User');
        this.whenJoined.failure(new Error('Cannot connect to host'));
        break;
      case 'MESSAGE':
        this.onMessage.trigger(json.message);
        break;
      default:
        this.default._onServerMessage(json);
    }
  }
}),

Host: () => ({
  id: null,
  name: null,
  onNewClient: createPromiseEventListener(),
  onLostClient: createPromiseEventListener(),
  onMessage: createPromiseEventListener(),
  send(message, clientIDs) {
    this._ws.send(JSON.stringify({
      type: 'SEND',
      message,
      clientIDs,
    }));
  },
  _onServerMessage(json) {
    switch(json.type) {
      case 'REGISTERED':
        this.id = json.hostID;
        this.name = json.hostName;
        this.whenHosting.success(json);
        break;
      case 'NEW_CLIENT':
        this.onNewClient.trigger(json.clientID, json.request);
        break;
      case 'LOST_CLIENT':
        this.onLostClient.trigger(json.clientID);
        break;
      case 'FROM_CLIENT':
        this.onMessage.trigger(json.message, json.clientID);
        break;
      default:
        this.default._onServerMessage(json);
    }
  }
}),

User: () => ({
  host(hostType) {
    let req = hostTypeObject(hostType);
    req.type = 'HOST';

    this.whenServerConnected.then(()=>{
      this._ws.send(JSON.stringify(req));
    }).else(()=>{
      // when we lose server connection, switch to Dead mode
      this._changeType('Dead');
    });
    this._changeType('Host');
    this._setThen(this.whenHosting);
    return this;
  },
  join(hostType) {
    let req = hostTypeObject(hostType);
    req.type = 'CONNECT';

    this.whenServerConnected.then(()=>{
      this._ws.send(JSON.stringify(req));
    }).else(()=>{
      // when we lose server connection, switch to Dead mode
      this._changeType('Dead');
    });
    this._changeType('Client');
    this._setThen(this.whenJoined);
    return this;
  },
  joinOrHost(hostType) {
    this.join(hostType).else(() => this.host(hostType));
    return this;
  }
})};

class NexusBase {
  constructor(nexusServerAddress) {
    this._type = null;
    this.nexusServerAddress = nexusServerAddress;
    this.default = this.__proto__;

    this.whenServerConnected = createAwaitableResult();
    this.whenHosting = createAwaitableResult(); // when we have registered as a host
    this.whenJoined = createAwaitableResult(); // when we have joined a host

    this.onClose = createPromiseEventListener();
    this.onList = createPromiseEventListener();

    this._ws = new WebSocket(nexusServerAddress);
    this._ws.onmessage = e => {
      this._log('* ServerMessage:', e.data);
      const json = JSON.parse(e.data);
      this._onServerMessage(json);
    };
    this._ws.onopen = this.whenServerConnected.success;
    this._ws.onerror = () => {
      const error = new Error('Server connection failed');
      this.whenServerConnected.failure(error);
    };
    this._ws.onclose = ({ code, reason }) => this.onClose.trigger(code, reason);

    this._setThen(this.whenServerConnected);
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
    return this.onClose;
  }

  _onServerMessage(json) {
    switch(json.type) {
      case 'LIST':
        this.onList.trigger(json.payload);
        break;
      default:
        console.log('(Ignorning server message:', json);
    }
  }

  _log(...args) {
    if(this.debug || Nexus.debug) {
      console.log(...args);
    }
  }

  // Allow .then/await to be used on an instance of this class
  _setThen(awaitable) {
    this.then = (resolved) => {
      const doResolve = ()=>{
        this.then = undefined; // prevent infinite cycle when awaiting this thenable object that returns this same object
        resolved(this);
      };

      awaitable.then(doResolve);
      return this;
    }

    this.else = (rejected) => {
      const doReject = ()=>{
        this.then = undefined; // prevent infinite cycle when awaiting this thenable object that returns this same object
        rejected(this);
      };

      awaitable.else(doReject);
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

  const type = NexusTypes[typeName];
  const props = type();
  Object.assign(obj, props);
  obj._typeProps = Object.keys(props);
  obj._type = typeName;
}

function createPromiseEventListener() {
  let anyNonce = false;
  let listeners = [];

  function promiseEventListener(callback) {
    if(typeof callback !== 'function') throw new Error('Callbacks must be functions');

    listeners.push(callback);
    return promiseEventListener;
  }

  promiseEventListener.then = function(callback) {
    if(typeof callback !== 'function') throw new Error('Callbacks must be functions');

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

function createAwaitableResult() {
  let goodResult;
  let badResult;

  let thenListeners = createPromiseEventListener();
  let elseListeners = createPromiseEventListener();

  function awaitableResult(resolved, rejected) {
    if(resolved) thenListeners(resolved);
    if(rejected) elseListeners(rejected);

    if(goodResult) {
      resolved(...goodResult);
    } else if(badResult) {
      rejected(...badResult);
    }

    return awaitableResult;
  }

  awaitableResult.then = function(callback) {
    if(goodResult) {
      callback(...goodResult);
    } else {
      thenListeners.then(callback);
    }
    return awaitableResult;
  }

  awaitableResult.else = function(callback) {
    if(badResult) {
      callback(...badResult);
    } else {
      elseListeners.then(callback);
    }
    return awaitableResult;
  }

  awaitableResult.success = function(...args) {
    goodResult = args;
    badResult = null;

    thenListeners.trigger(...args);
  }

  awaitableResult.failure = function(...args) {
    goodResult = null;
    badResult = args;

    elseListeners.trigger(...args);
  }

  return awaitableResult;
}

function hostTypeObject(hostType) {
  let obj;
  switch(typeof hostType) {
    case 'string':
      obj = { hostName: hostType };
      break;
    case 'number':
      obj = { hostID: hostType };
      break;
    case 'object':
      obj = hostType;
      break;
    default:
      throw new Error('Invalid hostType:', hostType);
  }
  return obj;
}

const Nexus = (serverAddress='ws://127.0.0.1:3000') => new NexusBase(serverAddress);
return Nexus;

})();
