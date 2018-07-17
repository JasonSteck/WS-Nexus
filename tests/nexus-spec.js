const server = 'ws://127.0.0.1:3000';

describe('JS-Nexus', function() {

  // Throw error if a Nexus server is not running
  new EnsureConnection();

  setSpecHelper(NexusSpecHelpers);

  afterEach(async function() {
    // await this.closeAllConnections(); // comes from NexusSpecHelpers
  });

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
      client = await Nexus(server);
    });

    it('can connect to a host by name', async function() {
      const name = 'Frogger';
      const host = await Nexus(server).host(name);

      const onNewClient = host.onNewClient.then((id, request) => {
        expect(id).toBe(1);
        expect(request).toEqual({
          type: 'CONNECT',
          hostName: name,
        });
      });
      await client.join(name);
      await onNewClient;
    });

    it('can connect to a host by id', async function() {
      const host = await Nexus(server).host("Asteroids");

      const onNewClient = host.onNewClient.then((id, request) => {
        expect(id).toBe(1);
        expect(request).toEqual({
          type: 'CONNECT',
          hostID: host.id,
        });
      });
      await client.join(host.id);
      await onNewClient;
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
});