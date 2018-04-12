const ServerAddr = 'ws://localhost:3000';

fdescribe('JS-Nexus Server', function() {

  // Throw error if a Nexus server is not running
  const testConnection = new EnsureConnection();
  onDoneTesting.then(() => testConnection.close());

  setSpecHelper(NexusSpecHelpers);

  beforeEach(function() {
    if(testConnection.closed) throw new Error('no connection');
  });

  describe('client.getHostList()', function() {
    it('only returns active hosts', async function() {
      const host1 = this.newHost();
      await host1.onRegistered();
      expect(host1.id).not.toEqual(undefined);
      expect(host1.name).not.toEqual(undefined);

      const host2 = this.newHost();
      await host2.onRegistered();
      expect(host2.id).not.toEqual(undefined);
      expect(host2.name).not.toEqual(undefined);

      const client = this.newClient();
      await client.onServerConnect();
      // Make sure the hosts are listed
      let list = await client.getHostList();
      this.expectHostToBeListed(host1, list);
      this.expectHostToBeListed(host2, list);

      // cleanup
      await host1.close();
      list = await client.getHostList();
      // make sure host is no longer listed
      this.expectHostNotToBeListed(host1, list);
      this.expectHostToBeListed(host2, list);

      await host2.close();
      list = await client.getHostList();
      this.expectHostNotToBeListed(host1, list);
      this.expectHostNotToBeListed(host2, list);

      await client.close();
    });
  });
});
