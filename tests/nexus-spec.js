const apiVersion = '1.1.0';

const server = 'ws://127.0.0.1:34777';
const badServer = 'ws://127.0.0.1:777';

function promise(resolver=()=>{}) {
  let resolve;
  let reject;
  const promise = new Promise((res, rej)=>resolver(resolve = res, reject = rej));
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
}

describe('WS-Nexus', function() {
  setSpecHelper(NexusSpecHelpers);
  manageWebSockets();
  catchMissedEvents();

  describe('user:', function() {
    let user;
    beforeEach(async function(){
      user = await Nexus(server);
    });

    describe('getHosts()', function() {
      it('only returns active hosts', async function() {
        const host1 = await Nexus(server).host('Pac-Man');
        const host2 = await Nexus(server).host('Donkey Kong');

        let list = await user.getHosts();
        this.expectHostToBeListed(host1, list);
        this.expectHostToBeListed(host2, list);

        await host1.close(); // still has a potential race condition
        list = await user.getHosts();
        this.expectHostNotToBeListed(host1, list);
        this.expectHostToBeListed(host2, list);

        await host2.close(); // still has a potential race condition
        list = await user.getHosts();
        this.expectHostNotToBeListed(host1, list);
        this.expectHostNotToBeListed(host2, list);
      });
    });

    when('the server is down', function() {
      it('triggers an .onError', async function() {
        let caught = promise();
        let user = Nexus(badServer).onError(caught.resolve);
        await caught;
        expect(user.type).toBe('User');
      });

      it('triggers a .onError even if they tried to .join', async function() {
        let caught = promise();

        let user = Nexus(badServer)
          .onError(() => caught.resolve())
          .join('The Game');
        await caught;

        expect(user.type).toBe('Dead');
      });

      it('triggers a .onError even if they tried to .host', async function() {
        let caught = promise();

        let user = Nexus(badServer)
          .onError(() => caught.resolve())
          .host('The Game');
        await caught;

        expect(user.type).toBe('Dead');
      });
    });
  });

  describe('client:', function() {
    let client;
    beforeEach(async function(){
      client = await timebox(Nexus(server));
    });

    it('can connect to a host by name', async function() {
      const name = 'Frogger';
      const host = await timebox(Nexus(server).host(name));

      const onNewClient = host.onNewClient.then((id, request) => {
        expect(id).toBe(1);
        expect(request).toEqual({
          type: 'JOIN',
          name: name,
        });
      });
      await Promise.all([
        client.join(name),
        onNewClient,
      ]);
    });

    it('can connect to a host by id', async function() {
      const host = await timebox(Nexus(server).host("Asteroids"));

      const onNewClient = host.onNewClient.then((id, request) => {
        expect(id).toBe(1);
        expect(request).toEqual({
          type: 'JOIN',
          id: host.id,
        });
      });
      await Promise.all([
        client.join(host.id),
        onNewClient,
      ]);
    });

    when('connected to a host', function() {
      beforeEach(async function() {
        this.host = await Nexus(server).host('Space Invaders');

        client.join(this.host.id);
        await this.host.onNewClient;
        await client.joined;
      });

      it('can send messages to the host', async function() {
        const msg = "Hello there!";
        client.send(msg);

        await this.host.onMessage.then((message, id) => {
          expect(message).toBe(msg);
          expect(id).toBe(1);
        });
      });

      it('can receive messages from the host', async function() {
        const msg = "General Kenobi";
        this.host.send(msg);

        const message = await client.onMessage;
        expect(message).toBe(msg);
      });
    });

    when('attempting to connect to a non-existent host', function() {
      it('triggers a .onError', async function() {
        let caught = promise();

        client
          .join({ id: -18237867 })
          .onError(caught.resolve);

        await caught;

        expect(client.type).toBe('User');
      });

      it('can become a host itself', async function() {
        client.joinOrHost('Defender');
        await timebox(client.whenHosting);
        expect(client.type).toBe('Host');

        const user2 = Nexus(server).joinOrHost('Defender');
        await timebox(user2.whenJoined);
        expect(user2.type).toBe('Client');
      });
    });
  });

  describe('host:', function() {
    let host;

    beforeEach(async function() {
      host = await Nexus(server).host('Tron');
    });

    when('it has clients', function() {
      let client1;
      let client2;
      let client3;

      beforeEach(async function() {
        let numClients = 0;
        const hasAllClients = promise();
        host.onNewClient(id => {
          numClients++;
          if(numClients==3) hasAllClients.resolve();
        });

        client1 = await Nexus(server).join(host.id);
        client2 = await Nexus(server).join(host.id);
        client3 = await Nexus(server).join(host.id);
        await hasAllClients;
      });

      it('keeps track of the current client ids', async function() {
        let id;
        expect(host.clientIDs).toEqual([1,2,3]);

        client2.close();
        id = await host.onLostClient;
        expect(id).toBe(2);
        expect(host.clientIDs).toEqual([1,3]);

        client3.close();
        id = await host.onLostClient;
        expect(id).toBe(3);
        expect(host.clientIDs).toEqual([1]);

        client1.close();
        id = await host.onLostClient;
        expect(id).toBe(1);
        expect(host.clientIDs).toEqual([]);
      });

      it('does not let a message from one client leak to others', async function() {
        let msg1=null;
        let msg2=null;
        let msg3=null;

        client1.onMessage(m => msg1=m);
        client2.onMessage(m => msg2=m);
        client3.onMessage(m => msg3=m);

        function verifySecret(msg, id) {
          expect(msg).toEqual('secret');
          expect(id).toEqual(2);
        }

        client2.send('secret');
        await host.onMessage.then(verifySecret);

        client2.send('another secret');
        const msg = await host.onMessage;
        expect(msg).toBe('another secret');

        expect(msg1).toBe(null);
        expect(msg2).toBe(null);
        expect(msg3).toBe(null);
      });

      it('can message exactly one of them at a time', async function() {
        let msg1=null;
        let msg2=null;
        let msg3=null;

        client1.onMessage(m => msg1=m);
        client2.onMessage(m => msg2=m);
        client3.onMessage(m => msg3=m);

        host.send('one', 1);

        await client1.onMessage;
        expect(msg1).toEqual('one');
        expect(msg2).not.toExist();
        expect(msg3).not.toExist();

        host.send('two', 2);

        await client2.onMessage;
        expect(msg1).toEqual('one');
        expect(msg2).toEqual('two');
        expect(msg3).not.toExist();

        host.send('three', 3);

        await client3.onMessage;
        expect(msg1).toEqual('one');
        expect(msg2).toEqual('two');
        expect(msg3).toEqual('three');
      });

      it('can message multiple clients', async function() {
        let msg1=null;
        let msg2=null;
        let msg3=null;

        client1.onMessage(m => msg1=m);
        client2.onMessage(m => msg2=m);
        client3.onMessage(m => msg3=m);

        const msgOneTwo = 'one and two';
        const msgTwoThree = 'two and three';

        host.send(msgOneTwo, [1, 2]);
        await Promise.all([
          client1.onMessage,
          client2.onMessage,
        ]);

        expect(msg1).toBe(msgOneTwo);
        expect(msg2).toBe(msgOneTwo);
        expect(msg3).toBe(null);

        host.send(msgTwoThree, [2, 3]);
        await Promise.all([
          client2.onMessage,
          client3.onMessage,
        ]);

        expect(msg1).toBe(msgOneTwo);
        expect(msg2).toBe(msgTwoThree);
        expect(msg3).toBe(msgTwoThree);
      });

      it('can message all clients', async function() {
        const msg = 'all';

        host.send(msg);
        await Promise.all([
          client1.onMessage,
          client2.onMessage,
          client3.onMessage,
        ]).then(([msg1, msg2, msg3]) => {
          expect(msg1).toBe(msg);
          expect(msg2).toBe(msg);
          expect(msg3).toBe(msg);
        });
      });

      it('gets notified when a client disconnects', async function() {
        let id;

        client1.close();
        id = await host.onLostClient;
        expect(id).toEqual(1);

        client2.close();
        id = await host.onLostClient;
        expect(id).toEqual(2);
      });

      it('disconnects all clients when it closes (and handle clients that are already closed or closing)', async function() {
        await client1.close(); // close 1 early
        host.close();
        const onClose2 = client2.close(); // close 2 at the same time as host
        const onClose3 = client3.onClose; // listen for 3 to close

        await onClose2;
        await onClose3.then((reason, code) => {
          expect(reason).toEqual('Host was closed');
          expect(code).toEqual(1001);
        });
      });
    });
  });

  describe('unhandled awaitableEvents:', function() {
    when('we connect to the server', function() {
      it('shows a warning', async function() {
        const user = Nexus(server);
        const [event] = await this.warningSpy('.whenServerConnected.then');
        expect(event.type).toEqual('open');
      });
    });

    when('we fail to connect to the server', function() {
      it('shows a warning', async function() {
        const user = Nexus(badServer);
        const [error] = await this.warningSpy('.whenServerConnected.onError');
        expect(error.message).toEqual('Server connection failed');
      });
    });

    when('we begin hosting', function() {
      it('shows a warning', async function() {
        const user = Nexus(server).host('Galaxian');
        const [hostInfo] = await this.warningSpy('.whenHosting.then');
        expect(hostInfo.id).toExist();
      });
    });

    when('we join', function() {
      it('shows a warning', async function() {
        await Nexus(server).host('Galaxian');
        Nexus(server).join('Galaxian');

        const [hostInfo] = await this.warningSpy('.whenJoined.then');
        expect(hostInfo.id).toExist();
      });
    });

    when('we fail to join', function() {
      it('shows a warning', async function() {
        Nexus(server).join('Galaxian');

        const [error] = await this.warningSpy('.whenJoined.onError');
        expect(error.message).toBe('Cannot connect to host');
      });
    });

    when('our connection closes', function() {
      it('shows a warning (but not to those who close themselves)', async function() {
        const host = await Nexus(server).host('Centipede');
        await Promise.all([
          Nexus(server).join({ id: host.id }),
          host.onNewClient,
        ]);
        host.close(); // causes the client to close too, which will throw the warning for them.

        const [reason, code] = await this.warningSpy('.onClose.then');
        expect(reason).toBe('Host was closed'); // expect the client to have the warning, not the host.
        expect(code).toBe(1001);
      });
    });

    when('we receive a host list', function() {
      it('shows a warning', async function() {
        Nexus(server).getHosts();

        const [hosts] = await this.warningSpy('.onList.then');
        expect(Array.isArray(hosts)).toBe(true);
      });
    });

    when('we receive a message as a client', function() {
      it('shows a warning', async function() {
        const host = await Nexus(server).host('Centipede');
        await Nexus(server).join(host.id);
        host.send('hello');

        const [msg] = await this.warningSpy('<Client>.onMessage.then');
        expect(msg).toBe('hello');
      });
    });

    when('a client joins', function() {
      it('shows a warning', async function() {
        const host = await Nexus(server).host('Centipede');
        Nexus(server).join(host.id);

        const [id, request] = await this.warningSpy('<Host>.onNewClient.then');
        expect(id).toBe(1);
        expect(request.id).toEqual(host.id);
      });
    });

    when('a client leaves', function() {
      it('shows a warning', async function() {
        const host = await Nexus(server).host('Centipede');
        Nexus(server).join(host.id).close();

        const [id] = await this.warningSpy('<Host>.onLostClient.then');
        expect(id).toBe(1);
      });
    });

    when('a host receives a message', function() {
      it('shows a warning', async function() {
        const host = await Nexus(server).host('Centipede');
        Nexus(server).join(host.id).send('hello!');

        const [msg, id] = await this.warningSpy('<Host>.onMessage.then');
        expect(msg).toBe('hello!');
        expect(id).toBe(1);
      });
    });
  });

  describe("server's and user's apiVersions:", function() {
    let user;
    beforeEach(function() {
      stub(console).warn;
      stub(console).error;
      Nexus.resetApiWarnings();

      user = Nexus(server);

      const fakeVersion = apiVersion.split('.');
      this.setVersion = (index, val) => {
        fakeVersion[index] = val;
        user.apiVersion = fakeVersion.join('.')
      }
    });

    when("they are the same", function() {
      it("shows no warnings or errors", async function() {
        await user.onServerInfo;
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
      });
    })

    when("their patch versions differ", function() {
      beforeEach(async function() {
        this.setVersion(2, '777');
      });

      it("shows no warnings or errors", async function() {
        await user.onServerInfo;
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
      });
    });

    when("their minor versions differ", function() {
      beforeEach(async function() {
        this.setVersion(1, '777');
      });

      it("warns that optional features may not work", async function() {
        await user.onServerInfo;
        expect(console.warn).toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
      });
    });

    when("their major versions differ", function() {
      beforeEach(async function() {
        this.setVersion(0, '777');
      });

      it("warns that required features may not work", async function() {
        await user.onServerInfo;
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
      });
    });
  });
});
