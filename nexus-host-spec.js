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

    this.newHost = ({nexusServer, hostName}={}) => (
      this.host = newNexusHost(
        nexusServer || defaultNexusServer,
        hostName || defaultHostName,
      )
    );
  });

  describe('#newNexusHost(nexusServer, hostName, [options])', function() {
    it('throws an error if a nexusServer address is not provided', function() {
      expect(() => newNexusHost()).toThrow(new Error('Missing nexusServer address'));
    });

    it('throws an error if a hostName is not provided', function() {
      expect(() => newNexusHost('ws://localhost:3000')).toThrow(new Error('Missing hostName'));
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

        expect(this.ws.send).toHaveBeenCalledWith({
          type: 'HOST',
          payload: defaultHostName,
        });
      });
    });
  });

  describe('if connection fails', function() {
    it('calls the .onerror if provided', function() {
      this.stubWebSocket();
      this.newHost().onerror = (event) => { this.event = event };
      let err = {data:'err'};
      this.ws.onerror(err);

      expect(this.event).toBe(err);
    });

    it('does not crash if there is no .onerror callback specified', function() {
      this.stubWebSocket();
      this.newHost();

      expect(()=>this.ws.onerror(err)).not.toThrow();
    });
  });
});
