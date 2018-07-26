const server = 'ws://127.0.0.1:3000';

function promise(resolver=()=>{}) {
  let resolve;
  let reject;
  const promise = new Promise((res, rej)=>resolver(resolve = res, reject = rej));
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
}

describe('JS-Nexus', function() {
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

        await host1.close();
        list = await user.getHosts();
        this.expectHostNotToBeListed(host1, list);
        this.expectHostToBeListed(host2, list);

        await host2.close();
        list = await user.getHosts();
        this.expectHostNotToBeListed(host1, list);
        this.expectHostNotToBeListed(host2, list);
      });
    });

    when('the server is down', function() {
      const badServer = 'ws://127.0.0.1:777';

      it('triggers an else', async function() {
        let caught = promise();
        let user = Nexus(badServer).else(caught.resolve);
        await caught;
        expect(user.type).toBe('User');
      });

      it('triggers a .else even if they tried to .join', async function() {
        let caught = promise();

        let user = Nexus(badServer)
          .else(() => caught.resolve())
          .join('The Game');
        await caught;

        expect(user.type).toBe('Dead');
      });

      it('triggers a .else even if they tried to .host', async function() {
        let caught = promise();

        let user = Nexus(badServer)
          .else(() => caught.resolve())
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
          type: 'CONNECT',
          hostName: name,
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
          type: 'CONNECT',
          hostID: host.id,
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
      it('triggers a .else', async function() {
        let caught = promise();

        client
          .join({ hostID: -18237867 })
          .else(caught.resolve);

        await caught;

        expect(client.type).toBe('User');
      });

      it('can become a host itself', async function() {
        client.joinOrHost('Defender');
        await client.whenHosting;
        expect(client.type).toBe('Host');

        const user2 = Nexus(server).joinOrHost('Defender');
        await user2.whenJoined;
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
        client1 = await Nexus(server).join(host.id);
        client2 = await Nexus(server).join(host.id);
        client3 = await Nexus(server).join(host.id);
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
        await onClose3.then((code, reason) => {
          expect(code).toEqual(1001);
          expect(reason).toEqual('Host was closed');
        });
      });
    });
  });

  describe('unhandled awaitableEvents', function() {
    when('we fail to connect to the server', function() {
      it('shows a warning', async function() {
        const user = Nexus(server);
        const [event] = await this.warningSpy('whenServerConnected');
        expect(event.type).toEqual('open');
      });
    });
  });
});
