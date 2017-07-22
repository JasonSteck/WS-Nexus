beforeEach(function() {
  this.val = 1;
});

it('can run a basic test', function() {
  expect(this.val).toBe(1);
});

describe('nexus-host.js', function() {
  beforeEach(function() {
    expect(this.val).toBe(1);
    this.val = 2;
  });

  afterEach(function() {
    expect(this.val).toEqual(5);
    this.val = 6;
  });

  describe('with a nested describe', function() {
    beforeEach(function() {
      expect(this.val).toEqual(2);
      this.val = 3;
    });

    it('works', function() {
      expect(this.val).toEqual(3);
      this.val = 4;
    });

    it('works well', function() {
      expect(this.val).toEqual(3);
      this.val = 4;
    });

    afterEach(function() {
      expect(this.val).toEqual(4);
      this.val = 5;
    });
  });
});

afterEach(function() {
  expect(this.val == 1 || this.val == 6 ).toBe(true);
});
