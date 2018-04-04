const ServerAddr = 'ws://localhost:3000';

describe('JS-Nexus Server', function() {

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

  when('a host and client connect', function() {
    it('can let them communicate', async function() {
      this.newHost();
      await this.onRegistered();
      expect(this.host.id).not.toEqual(undefined);
      expect(this.host.name).not.toEqual(undefined);

      this.newClient();
      await this.onServerConnect();
      let list = await this.getHostList();
      expect(list && list.length).not.toEqual(0);
      let hostRegistry = this.findHost(list, this.host.id);
      expect(hostRegistry.hostName).toBe(this.host.name);

      await this.closeHost();
      list = await this.getHostList();
      hostRegistry = this.findHost(list, this.host.id);
      expect(hostRegistry.hostName).toBe(this.host.name);
      await this.closeClient();
    });
  });
});
