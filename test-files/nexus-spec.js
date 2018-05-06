const ServerAddr = 'ws://localhost:3000';

describe('JS-Nexus Server', function() {

  // Throw error if a Nexus server is not running
  new EnsureConnection();

  setSpecHelper(NexusSpecHelpers);

  afterEach(async function() {
    const conns = this.connections; // comes from spec helper
    for(let i=0; i< conns.length; i++) {
      await conns[i].close();
    }
  });

  describe('a client', function() {
    beforeEach(async function(){
      this.client = this.newClient();
      await this.client.onServerConnect();
    });

    describe('getHostList()', function() {
      it('only returns active hosts', async function() {
        const host1 = this.newHost();
        await host1.onRegistered();

        const host2 = this.newHost();
        await host2.onRegistered();

        let list = await this.client.getHostList();
        this.expectHostToBeListed(host1, list);
        this.expectHostToBeListed(host2, list);

        await host1.close();
        list = await this.client.getHostList();
        this.expectHostNotToBeListed(host1, list);
        this.expectHostToBeListed(host2, list);

        await host2.close();
        list = await this.client.getHostList();
        this.expectHostNotToBeListed(host1, list);
        this.expectHostNotToBeListed(host2, list);
      });
    });

    when('attempting to connect to a non-existent host', function() {
      it('receives an error message', async function() {
        const req = { hostID: -18237867 };

        const failedReq = await this.client.failingConnect(req);
        expect(failedReq.hostID).toEqual(req.hostID);
      });
    });

    when('connecting to an existing host by name', function() {
      beforeEach(async function() {
        this.host = this.newHost();
        await this.host.onRegistered();

        const onNewClient = this.host.onNewClient(); // first, setup the listener
        this.hostInfo = await this.client.connect({ hostName: this.host.name });
        this.clientID = await onNewClient; // wait for host to get client
      });

      it("gets the host's information (id and name)", async function() {
        expect(this.hostInfo.hostID).toEqual(this.host.id);
        expect(this.hostInfo.hostName).toEqual(this.host.name);
      });

      it('is assigned an ID that is given to the host', async function() {
        expect(this.clientID).toEqual(1);
      });
    });

    when('connecting to an existing host by id', function() {
      beforeEach(async function() {
        this.host = this.newHost();
        await this.host.onRegistered();

        const onNewClient = this.host.onNewClient(); // first, setup the listener
        this.hostInfo = await this.client.connect({ hostID: this.host.id });
        this.clientID = await onNewClient; // wait for host to get client
      });

      it("gets the host's information (id and name)", async function() {
        expect(this.hostInfo.hostID).toEqual(this.host.id);
        expect(this.hostInfo.hostName).toEqual(this.host.name);
      });

      it('is assigned an ID that is given to the host', async function() {
        expect(this.clientID).toEqual(1);
      });

      it('can send messages to the host', async function() {
        const msg = "Hello there";
        this.client.send(msg);
        const [recieved, id] = await this.host.onClientMessage();
        expect(id).toEqual(1);
        expect(recieved).toEqual(msg);
      });

      it('can recieve messages from the host', async function() {
        const msg = "General Kenobi";
        this.host.send(msg, this.clientID);
        const recieved = await this.client.onMessage();
        expect(recieved).toEqual(msg);
      });
    });
  });

  describe('a host', function() {
    beforeEach(async function() {
      this.host = this.newHost();
      await this.host.onRegistered();
    });

    it('can register', async function() {
      expect(this.host.id).not.toEqual(undefined);
      expect(this.host.name).not.toEqual(undefined);
    });
  });
});
