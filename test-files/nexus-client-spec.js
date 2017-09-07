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

    this.triggerServerConnected = () => {
      this.ws.onopen && this.ws.onopen();
    };
  });

  describe('new nexusClient(nexusServer, autoConnectOptions)', function() {
    it('requires a nexusServer address', function() {
      expect(()=>new nexusClient()).toThrow(new Error('Missing nexusServer address'));
    });

    it('connects to the nexus server provided', function() {
      this.newClient(this.defaultServer);
      expect(window.WebSocket).toHaveBeenCalledWith(this.defaultServer);
    });

    describe('when provided an autoConnectOptions', function() {
      it('tries to connect with the given options', function() {
        const hostID = 8;
        const hostName = 'fight club';
        this.newClient(this.defaultServer, {
          hostID,
          hostName,
        });

        this.triggerServerConnected(); // simulate server connection

        expect(this.ws.send).toHaveBeenCalledWith(JSON.stringify({
          type: 'CONNECT',
          hostID,
          hostName,
        }));
      });
    });

    describe('when not provedied an autoConnectOptions', function() {
      it('does not send anything after connecting to server', function() {
        this.newClient(this.defaultServer);

        this.triggerServerConnected(); // simulate server connection

        expect(this.ws.send).not.toHaveBeenCalled();
      });
    });
  });
});
