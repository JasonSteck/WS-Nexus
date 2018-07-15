const server = 'ws://127.0.0.1:3000';

describe('JS-Nexus', function() {

  // Throw error if a Nexus server is not running
  new EnsureConnection();

  setSpecHelper(NexusSpecHelpers);

  afterEach(async function() {
    // await this.closeAllConnections(); // comes from NexusSpecHelpers
  });

  describe('a user', function() {
    let user;
    beforeEach(async function(){
      user = await Nexus(server);
    });

    describe('getHosts()', function() {
      it('only returns active hosts', async function() {
        const host1 = await Nexus(server).host('You Lost');
        const host2 = await Nexus(server).host('The Game');

        let list = await user.getHosts();
        this.expectHostToBeListed(host1, list);
        this.expectHostToBeListed(host2, list);

        await host1.close();
        list = await user.getHosts();
        this.expectHostNotToBeListed(host1, list);
        this.expectHostToBeListed(host2, list);

        await host2.close();
        list = await timebox(user.getHosts());
        this.expectHostNotToBeListed(host1, list);
        this.expectHostNotToBeListed(host2, list);
      });
    });
  });
});