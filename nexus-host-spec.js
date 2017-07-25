_WebSocket = window.WebSocket;
window.WebSocket = ()=>{ throw Error('WebSocket was called without being stubbed') };

describe('nexus-host.js', function() {
  beforeEach(function() {
    this.get = (...args) => this.host = newNexusHost.apply(null, args);
  });

  describe('#newNexusHost(nexusServer, hostName, [options={ hostID }])', function() {
    it('throws an error if a nexusServer address is not provided', function() {
      expect(() => this.get()).toThrow(new Error('Missing nexusServer address'));
    });

    it('throws an error if a hostName is not provided', function() {
      expect(() => this.get('ns')).toThrow(new Error('Missing hostName'));
    });

    it('connects to the nexus server and tries to register', function() {

    });
  });
});
