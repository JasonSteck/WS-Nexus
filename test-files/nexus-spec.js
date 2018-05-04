const ServerAddr = 'ws://localhost:3000';

fdescribe('JS-Nexus Server', function() {

  // Throw error if a Nexus server is not running
  const testConnection = new EnsureConnection();
  onDoneTesting.then(() => testConnection.close());

  setSpecHelper(NexusSpecHelpers);

  beforeEach(function() {
    if(testConnection.closed) throw new Error('no connection');
  });

  afterEach(async function() {
    const conns = this.connections; // comes from spec helper
    for(let i=0; i< conns.length; i++) {
      await conns[i].close();
    }
  });

  it('can register a host', async function() {
    const host = this.newHost();
    await host.onRegistered();
    expect(host.id).not.toEqual(undefined);
    expect(host.name).not.toEqual(undefined);
    await host.close();
  });

  describe('client.getHostList()', function() {
    it('only returns active hosts', async function() {
      const host1 = this.newHost();
      await host1.onRegistered();

      const host2 = this.newHost();
      await host2.onRegistered();

      const client = this.newClient();
      await client.onServerConnect();
      let list = await client.getHostList();
      this.expectHostToBeListed(host1, list);
      this.expectHostToBeListed(host2, list);

      await host1.close();
      list = await client.getHostList();
      this.expectHostNotToBeListed(host1, list);
      this.expectHostToBeListed(host2, list);

      await host2.close();
      list = await client.getHostList();
      this.expectHostNotToBeListed(host1, list);
      this.expectHostNotToBeListed(host2, list);

      await client.close();
    });
  });

  describe('a client', function() {
    beforeEach(async function(){
      this.client = this.newClient();
      await this.client.onServerConnect();
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

      it('can send and recieve messages from a host', async function() {
        const msg = "Hello there";
        this.client.send(msg);
        const [id, recieved] = await this.host.onClientMessage();
        expect(id).toEqual(1);
        expect(recieved).toEqual(msg);
      });
    });
  });
});
