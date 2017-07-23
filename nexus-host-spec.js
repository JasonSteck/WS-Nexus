describe('nexus-host.js', function() {
  describe('newNexusHost()', function() {
    beforeEach(function() {
      this.get = () => this.host = newNexusHost();
    });

    it('returns an object with the right properties', function() {
       expect(this.get()).toEqual({});
    });
  });
});
