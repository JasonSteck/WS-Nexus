describe('nexus-host.js', function() {
  beforeEach(function() {
    this.host = newNexusHost();
  });

  it('returns an object with the right functions', function() {
     expect(this.host).toEqual({});
  });
});
