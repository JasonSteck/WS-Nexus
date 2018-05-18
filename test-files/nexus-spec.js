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
      this.client = await this.newClient();
    });

    describe('getHostList()', function() {
      it('only returns active hosts', async function() {
        const host1 = await this.newHost();
        const host2 = await this.newHost();

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
        this.host = await this.newHost();

        const onNewClient = this.host.onNewClient(); // first, setup the listener
        this.hostInfo = await this.client.connect({ hostName: this.host.name });
        [this.clientID] = await onNewClient; // wait for host to get client
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
        this.host = await this.newHost();

        const onNewClient = this.host.onNewClient(); // first, setup the listener
        this.hostInfo = await this.client.connect({ hostID: this.host.id });
        [this.clientID, this.clientRequest] = await onNewClient; // wait for host to get client
      });

      it("gets the host's information (id and name)", async function() {
        expect(this.hostInfo.hostID).toEqual(this.host.id);
        expect(this.hostInfo.hostName).toEqual(this.host.name);
      });

      it('is assigned an ID that is given to the host', async function() {
        expect(this.clientID).toEqual(1);
      });

      it('gives the clients request to the host', async function() {
        expect(this.clientRequest).toEqual({ type: 'CONNECT', hostID: this.host.id })
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
      this.host = await this.newHost();
    });

    it('can register', async function() {
      expect(this.host.id).not.toEqual(undefined);
      expect(this.host.name).not.toEqual(undefined);
    });

    when('it has clients', function() {
      beforeEach(async function() {
        const target = { hostID: this.host.id };

        this.client1 = await this.newClient();
        await this.client1.connect(target);

        this.client2 = await this.newClient();
        await this.client2.connect(target);

        this.client3 = await this.newClient();
        await this.client3.connect(target);
      });

      it('can message exactly one of them at a time', async function() {
        let recieved;
        this.client2.throwOnMessage();
        this.client3.throwOnMessage();

        this.host.send('one', 1);
        recieved = await this.client1.onMessage();
        expect(recieved).toEqual('one');
        this.client1.throwOnMessage(); // should not recieve any more messages

        this.host.send('two', 2);
        recieved = await this.client2.onMessage();
        expect(recieved).toEqual('two');
        this.client2.throwOnMessage();

        this.host.send('three', 3);
        recieved = await this.client3.onMessage();
        expect(recieved).toEqual('three');
        this.client3.throwOnMessage(); // in case it recieves another message, somehow -.-
      });

      it('does not let a message from one client leak to others', async function() {
        this.client1.throwOnMessage();
        this.client2.throwOnMessage();
        this.client3.throwOnMessage();

        this.client2.send('secret');
        const [msg, id] = await this.host.onClientMessage();
        expect(msg).toEqual('secret');
        expect(id).toEqual(2);
      });

      it('can message multiple clients', async function() {
        const msg = 'two and three';
        this.client1.throwOnMessage();

        this.host.send(msg, [2,3]);
        const onTwoMessage = this.client2.onMessage();
        const onThreeMessage = this.client3.onMessage();

        const twoMessage = await onTwoMessage;
        const threeMessage = await onThreeMessage;

        expect(twoMessage).toEqual(msg);
        expect(threeMessage).toEqual(msg);
      });

      it('can message all clients', async function() {
        const msg = 'all';

        this.host.send(msg);
        const onOneMessage = this.client1.onMessage();
        const onTwoMessage = this.client2.onMessage();
        const onThreeMessage = this.client3.onMessage();

        const oneMessage = await onOneMessage;
        const twoMessage = await onTwoMessage;
        const threeMessage = await onThreeMessage;

        expect(oneMessage).toEqual(msg);
        expect(twoMessage).toEqual(msg);
        expect(threeMessage).toEqual(msg);
      });

      it('gets notified when a client disconnects', async function() {
        let id;

        this.client1.close();
        id = await this.host.onClientLost();
        expect(id).toEqual(1);

        this.client2.close();
        id = await this.host.onClientLost();
        expect(id).toEqual(2);
      });

      it('disconnects all clients when it closes (and handle clients that are already closed or closing)', async function() {
        await this.client1.close(); // close 1 early
        this.host.close();
        const client2OnClose = this.client2.close(); // close 2 at the same time as host
        const client3OnClose = this.client3.onClose(); // listen for 3 to close

        await client2OnClose;
        const [code, reason] = await client3OnClose;
        expect(code).toEqual(1000);
        expect(reason).toEqual('Host was closed');
      });
    });
  });
});
