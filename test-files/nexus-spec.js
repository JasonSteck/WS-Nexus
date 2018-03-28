const ServerAddr = 'ws://localhost:3000';
const DefaultName = 'defaultName';

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

class NexusSpecHelpers {
  newHost({ nexusServer, hostName, disableDefaultCallbacks = true }={}) {
    this.host = new nexusHost(
      nexusServer || ServerAddr,
      hostName || DefaultName,
      disableDefaultCallbacks,
    );
    return this.host;
  }

  onRegistered(host = this.host) {
    return new Promise(resolve => host.onRegistered = resolve);
  }
}

describe('JS-Nexus Server', function() {
  // Throw error if a Nexus server is not running
  const testConnection = new EnsureConnection();
  onDoneTesting.then(() => testConnection.close());

  beforeEach(function() {
    if(testConnection.closed) throw new Error('no connection');
    this.host; // may be read/set by NexusSpecHelpers

    // add async helper functions to context
    Object.setPrototypeOf(this, NexusSpecHelpers.prototype);
  });

  when('a host and client connect', function() {
    it('can let them communicate', async function() {
      this.newHost();
      await this.onRegistered();
      expect(this.host.id).not.toEqual(undefined);
    });
  });
});
