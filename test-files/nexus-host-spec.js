_WebSocket = window.WebSocket;
window.WebSocket = ()=>{ throw Error('WebSocket was called without being stubbed') };

describe('nexus-host.js', function() {
  const defaultNexusServer = 'ws://localhost:3000';
  const defaultHostName = 'myHostName';
  beforeEach(function() {
    this.stubWebSocket = () => {
      this.ws = {
        send: newSpy('send'),
      },
      stub(window).WebSocket.toReturn(this.ws);
    };

    this.newHost = ({nexusServer, hostName, disableDefaultCallbacks}={}) => (
      this.host = new nexusHost(
        nexusServer || defaultNexusServer,
        hostName || defaultHostName,
        disableDefaultCallbacks
      )
    );

    this.triggerNewClient = ({clientID, request}={}) => {
      const data = JSON.stringify({
        type: 'NEW_CLIENT',
        clientID: clientID || 7,
        request: request || JSON.stringify({
          // to figure out
        })
      });
      this.ws.onmessage({ data });
    };

    this.triggerClientMessage = ({clientID, message}={}) => {
      const data = JSON.stringify({
        type: 'FROM_CLIENT',
        clientID: clientID || 7,
        payload: message || "HAHA",
      });
      this.ws.onmessage({ data });
    };

    this.triggerClientLost = (clientID) => {
      const data = JSON.stringify({
        type: 'LOST_CLIENT',
        payload: clientID || 7,
      });
      this.ws.onmessage({ data });
    };

    this.triggerHostRegistered = (hostID=9) => {
      const data = JSON.stringify({
        type: 'REGISTERED',
        hostID: hostID,
      });
      this.ws.onmessage({ data });
    };

    this.triggerConnectionClosed = (event) => {
      this.ws.onclose && this.ws.onclose(event);
    };
  });

  describe('#new NexusHost(nexusServer, hostName, [options])', function() {
    it('throws an error if a nexusServer address is not provided', function() {
      expect(() => new nexusHost()).toThrow(new Error('Missing nexusServer address'));
    });

    it('throws an error if a hostName is not provided', function() {
      expect(() => new nexusHost('ws://localhost:3000')).toThrow(new Error('Missing hostName'));
    });

    it('connects to the nexus server', function() {
      this.stubWebSocket();
      this.newHost();
      expect(window.WebSocket).toHaveBeenCalledWith(defaultNexusServer);
    });

    describe('after connecting', function() {
      it('tries to register', function() {
        this.stubWebSocket();
        this.newHost();
        expect(()=>this.ws.onopen()).not.toThrow();

        expect(this.ws.send).toHaveBeenCalledWith(JSON.stringify({
          type: 'HOST',
          payload: defaultHostName,
        }));
      });
    });
  });

  describe('if connection fails', function() {
    it('calls the .onerror if provided', function() {
      this.stubWebSocket();
      this.newHost().onError = (event) => { this.event = event };
      let err = {data:'err'};

      this.ws.onerror(err); // simulate error

      expect(this.event).toBe(err);
    });

    it('does not crash if there is no .onerror callback specified', function() {
      this.stubWebSocket();
      this.newHost().onError = null;

      expect(()=>this.ws.onerror(err)).not.toThrow();
    });
  });

  describe('when a new user connects', function() {
    it('calls the .onNewClient if provided', function() {
      this.stubWebSocket();
      const callback = newSpy('onNewClient');
      this.newHost().onNewClient = callback;

      const clientID = 5;
      const request = {};
      this.triggerNewClient({clientID, request}); // simulate event

      expect(callback).toHaveBeenCalledWith(clientID, request);
    });

    it('does not crash if there is no callback specified', function() {
      this.stubWebSocket();
      this.newHost().onNewClient = null;

      expect(()=>this.triggerNewClient()).not.toThrow();
    });
  });

  describe('when we get something from the user', function() {
    it('calls the .onClientMessage if provided', function() {
      this.stubWebSocket();
      const callback = newSpy('onClientMessage');
      this.newHost().onClientMessage = callback;

      const clientID = 5;
      const message = 'Yo';
      this.triggerClientMessage({clientID, message}); // simulate event

      expect(callback).toHaveBeenCalledWith(clientID, message);
    });

    it('does not crash if there is no callback specified', function() {
      this.stubWebSocket();
      this.newHost().onClientMessage = null;

      expect(()=>this.triggerClientMessage()).not.toThrow();
    });
  });

  describe('when the user gets disconnected', function() {
    it('calls the .onClientLost if provided', function() {
      this.stubWebSocket();
      const callback = newSpy('onClientLost');
      this.newHost().onClientLost = callback;

      const clientID = 5;
      this.triggerClientLost(clientID); // simulate event

      expect(callback).toHaveBeenCalledWith(clientID);
    });

    it('does not crash if there is no callback specified', function() {
      this.stubWebSocket();
      this.newHost().onClientLost = null;

      expect(()=>this.triggerClientLost()).not.toThrow();
    });
  });

  describe('#send(msg, clientID)', function() {
    it('tries to send the message to the client with the ID', function() {
      this.stubWebSocket();
      const clientID = 8;
      const payload = 'hello there';
      this.newHost().send(payload, clientID);
      expect(this.ws.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'SEND',
        clientID,
        payload,
      }));
    });
  });

  describe('#send(msg)', function() {
    it('tries to send the message everyone', function() {
      this.stubWebSocket();
      const payload = 'hello there';
      this.newHost().send(payload);
      expect(this.ws.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'SEND',
        payload,
      }));
    });
  });

  describe('when the host gets registered', function() {
    it('calls the .onRegistered callback', function() {
      this.stubWebSocket();
      const callback = newSpy('onRegistered');
      this.newHost().onRegistered = callback;

      const hostID = 5;
      this.triggerHostRegistered(hostID); // simulate event

      expect(callback).toHaveBeenCalledWith(hostID);
    });

    it('does not crash if there is no callback specified', function() {
      this.stubWebSocket();
      this.newHost().onRegistered = null;

      expect(()=>this.triggerHostRegistered()).not.toThrow();
    });
  });

  describe('when the host gets registered', function() {
    it('calls the .onRegistered callback', function() {
      this.stubWebSocket();
      const callback = newSpy('onRegistered');
      this.newHost().onRegistered = callback;

      const hostID = 5;
      this.triggerHostRegistered(hostID); // simulate event

      expect(callback).toHaveBeenCalledWith(hostID);
    });

    it('does not crash if there is no callback specified', function() {
      this.stubWebSocket();
      this.newHost().onRegistered = null;

      expect(()=>this.triggerHostRegistered()).not.toThrow();
    });
  });

  describe('when the connection gets closed', function() {
    it('calls the .onClosed callback', function() {
      this.stubWebSocket();
      const callback = newSpy('onClosed');
      this.newHost().onClose = callback;

      const event = {};
      this.triggerConnectionClosed(event); // simulate event

      expect(callback).toHaveBeenCalledWith(event);
    });

    it('does not crash if there is no callback specified', function() {
      this.stubWebSocket();
      this.newHost().onClose = null;

      expect(()=>this.triggerConnectionClosed()).not.toThrow();
    });
  });

  // prevent variable and arrary from changing
  const callbackList = Object.freeze([
    "onRegistered",
    "onError",
    "onNewClient",
    "onClientMessage",
    "onClientLost",
  ]);

  describe('when disableDefaultCallbacks is true', function() {
    it('does not set default callbacks', function() {
      this.stubWebSocket();
      const host = this.newHost({disableDefaultCallbacks: true});
      for(let i=0;i<callbackList.length;i++) {
        expect(host[callbackList[i]]).toBe(undefined);
      }
    });
  });

  describe('when disableDefaultCallbacks is not defined', function() {
    it('sets default callbacks', function() {
      this.stubWebSocket();
      const host = this.newHost();
      for(let i=0;i<callbackList.length;i++) {
        expect(host[callbackList[i]]).not.toBe(undefined);
      }
    });
  });
});
