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
    this.defaultHostList = [
      {
        hostName: 'one',
        hostID: 1,
      },
      {
        hostName: 'two',
        hostID: 2,
      }
    ];
    this.defaultHost = this.defaultHostList[0];

    // Helper functions
    this.newClient = (nexusServer=this.defaultServer, autoConnectOptions) => {
      return this.client = new nexusClient(nexusServer, autoConnectOptions);
    };

    this.newConnectedClient = () => {
      this.newClient().connect(this.defaultHost, ()=>{});
    };

    this.triggerServerConnected = () => {
      this.ws.onopen && this.ws.onopen();
    };

    this.triggerHostList = () => {
      const data = JSON.stringify({
        type: 'LIST',
        payload: this.defaultHostList,
      });
      this.ws.onmessage && this.ws.onmessage({ data });
    };

    this.triggerHostConnected = () => {
      const data = JSON.stringify({
        type: 'CONNECTED',
      });
      this.ws.onmessage && this.ws.onmessage({ data });
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
        const connectRequest = JSON.stringify({
          type: 'CONNECT',
          hostID,
          hostName,
        })

        this.newClient(this.defaultServer, {
          hostID,
          hostName,
        });

        expect(this.ws.send).not.toHaveBeenCalledWith(connectRequest);

        this.triggerServerConnected(); // simulate server connection

        expect(this.ws.send).toHaveBeenCalledWith(connectRequest);
      });
    });

    describe('when not provided an autoConnectOptions', function() {
      it('does not send anything after connecting to server', function() {
        this.newClient(this.defaultServer);

        this.triggerServerConnected(); // simulate server connection

        expect(this.ws.send).not.toHaveBeenCalled();
      });
    });

    describe('when it connects to the server', function() {
      it('calls the .onServerConnect callback', function() {
        const callback = newSpy('onServerConnect');
        this.newClient().onServerConnect = callback;

        this.triggerServerConnected();

        expect(callback).toHaveBeenCalled();
      });
    });
  });

  describe('when not connected to a host', function() {
    describe('#getHostList(callback)', function() {
      it('sends a request', function() {
        this.newClient().getHostList(()=>{});
        expect(this.ws.send).toHaveBeenCalledWith(JSON.stringify({
          type: 'LIST',
        }));
      });

      it('calls the callback when we get the list', function() {
        const callback = newSpy('onHostList');
        this.newClient().getHostList(callback);

        this.triggerHostList();

        expect(callback).toHaveBeenCalledWith(this.defaultHostList);
      });
    });

    describe('#connect({hostName, hostID}, callback)', function() {
      it('sends a connection request', function() {
        const hostName = 'blah';
        const hostID = 6;
        this.newClient().connect({hostName, hostID});
        expect(this.ws.send).toHaveBeenCalledWith(JSON.stringify({
          type: 'CONNECT',
          hostName,
          hostID,
        }));
      });

      it('calls the callback when we connect', function() {
        const callback = newSpy('onConnect');
        const hostName = 'blah';
        const hostID = 6;
        this.newClient().connect({hostName, hostID}, callback);

        this.triggerHostConnected();

        expect(callback).toHaveBeenCalled();
      });
    });

    describe('#send()', function() {
      it('throws an error', function() {
        expect(()=>{
          this.newClient().send('do thing');
        }).toThrow(Error('Must be connected to a host before you send anything'));
      });
    });

    describe('#close()', function() {
      it('calls close on the socket', function() {
        this.newClient().close();
        expect(this.ws.close).toHaveBeenCalled();
      });
    });
  });

  describe('when connected to a host', function() {
    describe('#getHostList()', function() {
      it('throws an error', function() {
        this.newConnectedClient();
        this.triggerHostConnected();
        expect(()=>{
          this.client.getHostList(()=>{});
        }).toThrow(Error('Cannot get host list when connected to a host'));
      });
    });

    describe('#connect()', function() {
      it('throws an error', function() {
        const hostName = 'blah';
        const hostID = 6;
        this.newConnectedClient();
        this.triggerHostConnected();
        expect(()=>{
          this.client.connect({hostName, hostID});
        }).toThrow(Error('Cannot connect to a host: already connected to one'));
      });
    });

    describe('#send(msg)', function() {
      it('sends the raw message', function() {
        this.newConnectedClient();
        this.triggerHostConnected();
        this.client.send('Hello there');
        expect(this.ws.send).toHaveBeenCalledWith('Hello there');
      });
    });

    describe('#close()', function() {
      it('calls close on the socket', function() {
        this.newConnectedClient();
        this.triggerHostConnected();
        this.client.close();
        expect(this.ws.close).toHaveBeenCalled();
      });
    });
  });
});
