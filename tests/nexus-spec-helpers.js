(function(){

const SERVER_ADDR = 'ws://127.0.0.1:3000';

window.timebox = (promise, msg='', ms=1000) => {
  const error = new Error('timebox timeout: ' + msg);

  return new Promise((resolve, reject) => {
    const id = setTimeout(()=> { reject(error) }, ms);

    promise.then(val => {
      clearTimeout(id);
      resolve(val);
    })
    promise.catch && promise.catch(err => {
      clearTimeout(id);
      reject(err);
    });
  });
}

// ===================== Spec Helpers ===================== //

window.manageWebSockets = () => {
  // Throw error if a Nexus server is not running
  new EnsureConnection(WebSocket);

  // Keep track of (future) websockets for cleanup
  const connections = [];

  const _WebSocket = window.WebSocket.bind(window);
  window.WebSocket = function(...args) {
    const ws = new _WebSocket(...args);
    connections.push(ws);
    return ws;
  };

  afterEach(async () => {
    for(let i=0; i< connections.length; i++) {
      await connections[i].close();
    }
  });
};

window.catchMissedEvents = () => {
  beforeEach(function(){
    const listeners = {};
    stub(NexusBase.prototype)._missedEvent = (name) => {
      const spy = newSpy(name);
      spy.callFake = (...args) => {
//      console.log('<MISSED EVENT>', name, ...args);
        const p = listeners[name];
        p && p.resolve(args);
      }
      return spy;
    };

    this.warningSpy = (eventName) => listeners[eventName] = promise();
  });
}

window.NexusSpecHelpers = class NexusSpecHelpers {
  findHost(hostList, id) {
    // hostList := [ host, host, ...]
    // host := { id: integer, name: string}
    return hostList.find(host => host.id == id);
  }

  expectHostToBeListed(host, hostList) {
    expect(host && host.id).toExist();
    let hostRegistry = this.findHost(hostList, host.id);
    expect(hostRegistry).toExist();
    expect(hostRegistry.name).toBe(host.name);
  }

  expectHostNotToBeListed(host, hostList) {
    expect(host && host.id).toExist();
    let hostRegistry = this.findHost(hostList, host.id);
    expect(hostRegistry).toBe(undefined);
  }
}

class EnsureConnection {
  constructor(WebSocket) {
    this.ws = new WebSocket(SERVER_ADDR);
    this._shouldClose = false;

    let connectionPromise = timebox(
      new Promise(resolve => this.ws.onopen = resolve),
      `waiting for connecton to server`,
      this.requestTimeout,
    );

    this.ws.onclose = () => {
      if(!this._shouldClose) {
        connectionPromise = Promise.reject(new Error('lost connection to server'));
      }
    }

    beforeEach(async function() {
      if(this._shouldClose) throw new Error('Test connection was already closed');
      await connectionPromise;
    });

    onDoneTesting.then(() => this.close());
  }

  close() {
    this._shouldClose = true;
    this.ws.close();
  }
}

})();
