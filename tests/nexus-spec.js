const server = 'ws://127.0.0.1:3000';

describe('JS-Nexus', function() {
  setSpecHelper(NexusSpecHelpers);
  manageWebSockets();

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

      it('triggers a .catch', async function() {
        let caught = false;
        await Nexus(badServer).catch(() => caught = true);
        expect(caught).toBe(true);
      });

      it('triggers the second parameter of a .then', async function() {
        let resolved = false;
        let caught = false;

        await Nexus(badServer).then(
          () => resolved = true,
          () => caught = true,
        );
        expect(resolved).toBe(false);
        expect(caught).toBe(true);
      });

      it('triggers a .catch even if they tried to .join', async function() {
        let caught = null;

        await Nexus(badServer)
          .join('The Game')
          .catch(() => caught = true);

        expect(caught).toBe(true);
      });

      it('triggers a .catch even if they tried to .host', async function() {
        let caught = null;

        await Nexus(badServer)
          .host('The Game')
          .catch(() => caught = true);

        expect(caught).toBe(true);
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
      await timebox(client.join(name));
      await timebox(onNewClient);
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
      await timebox(client.join(host.id));
      await timebox(onNewClient);
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
      it('triggers a .catch', async function() {
        let caught = null;
        client.join({ hostID: -18237867 });
        await client.catch(() => caught = true);

        expect(caught).toBe(true);
      });

      it('triggers the second parameter of a .then', async function() {
        let caught = null;
        client.join({ hostID: -18237867 });
        await client.then(
          () => 'should not call this',
          () => caught = true,
        );
        expect(caught).toBe(true);
      });
    });
  });

  describe('a host', function() {
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
    });
  });
});
