log = function(val) { console.log(val); this.path = this.path||[];this.path.push(val) }

beforeEach(function() {
  log.call(this, 'A - Before');
});

describe('nexus-host.js', function (){
  beforeEach(function() {
    log.call(this, 'B - Before');
  });

  afterEach(function() {
    log.call(this, 'B - After');
  });

  describe('with tests', function (){
    beforeEach(function() {
      log.call(this, 'C - Before');
    });

    it('works', function (){
      log.call(this, 'C - IT 1');
    });

    it('works well', function(){
      log.call(this, 'C - IT 2');
    });

    afterEach(function() {
      log.call(this, 'C - After');
    });
  });
});

afterEach(function() {
    log.call(this, 'A - After');
});
