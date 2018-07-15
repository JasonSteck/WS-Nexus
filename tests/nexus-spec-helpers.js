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

window.NexusSpecHelpers = class NexusSpecHelpers {
  constructor() {
//     this.connections = [];
  }

  findHost(hostList, id) {
    // hostList := [ host, host, ...]
    // host := { hostID: integer, hostName: string}
    return hostList.find(host => host.hostID == id);
  }

  expectHostToBeListed(host, hostList) {
    expect(host && host.id).toExist();
    let hostRegistry = this.findHost(hostList, host.id);
    expect(hostRegistry).toExist();
    expect(hostRegistry.hostName).toBe(host.name);
  }

  expectHostNotToBeListed(host, hostList) {
    expect(host && host.id).toExist();
    let hostRegistry = this.findHost(hostList, host.id);
    expect(hostRegistry).toBe(undefined);
  }

//   async closeAllConnections() {
//     const conns = this.connections;
//     for(let i=0; i< conns.length; i++) {
//       await conns[i].close();
//     }
//   }
}

window.EnsureConnection = class EnsureConnection {
  constructor() {
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
