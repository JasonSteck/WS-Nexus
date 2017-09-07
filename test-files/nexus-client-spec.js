describe('nexusClient.js', function() {
  beforeEach(function() {
    // Stub WebSocket
    this.ws = {
      send: newSpy('send'),
      close: newSpy('close'),
    },
    stub(window).WebSocket.toReturn(this.ws);

    // Defaults
    this.defaultServer = 'ws://localhost:3000';

    // Helper functions
    this.newClient = (nexusServer=this.defaultServer, autoConnectOptions) => {
      return this.client = new nexusClient(nexusServer, autoConnectOptions);
    };
  });

  describe('new nexusClient(nexusServer, autoConnectOptions)', function() {
    it('requires a nexusServer address', function() {
      expect(()=>new nexusClient()).toThrow(new Error('Missing nexusServer address'));
    });
  });
});
