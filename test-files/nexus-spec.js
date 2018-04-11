const ServerAddr = 'ws://localhost:3000';

fdescribe('JS-Nexus Server', function() {

  // Throw error if a Nexus server is not running
  const testConnection = new EnsureConnection();
  onDoneTesting.then(() => testConnection.close());

  setSpecHelper(NexusSpecHelpers);

  beforeEach(function() {
    if(testConnection.closed) throw new Error('no connection');

    this.hostName = 'defaultName';
    this.host;
    this.client;
  });

  describe('client.getHostList()', function() {
    it('only returns active hosts', async function() {
      this.host1 = this.newHost({ hostName: 'host1' });
      await this.host1.onRegistered();
      expect(this.host1.id).not.toEqual(undefined);
      expect(this.host1.name).not.toEqual(undefined);

      this.host2 = this.newHost({ hostName: 'host2' });
      await this.host2.onRegistered();
      expect(this.host2.id).not.toEqual(undefined);
      expect(this.host2.name).not.toEqual(undefined);

      this.client = this.newClient();
      await this.client.onServerConnect();
      // Make sure the host is listed
      let list = await this.client.getHostList();
      expect(list && list.length).not.toEqual(0);
      let host1Registry = this.findHost(list, this.host1.id);
      expect(host1Registry && host1Registry.hostName).toBe(this.host1.name);
      let host2Registry = this.findHost(list, this.host2.id);
      expect(host2Registry && host2Registry.hostName).toBe(this.host2.name);

      // cleanup
      await this.host1.close();
      list = await this.client.getHostList();
      // make sure host is no longer listed
      host1Registry = this.findHost(list, this.host1.id);
      expect(host1Registry).toBe(undefined);
      host2Registry = this.findHost(list, this.host2.id);
      expect(host2Registry && host2Registry.hostName).toBe(this.host2.name);

      await this.host2.close();
      list = await this.client.getHostList();
      host1Registry = this.findHost(list, this.host1.id);
      expect(host1Registry).toBe(undefined);
      host2Registry = this.findHost(list, this.host2.id);
      expect(host2Registry).toBe(undefined);

      await this.client.close();
    });
  });
});
