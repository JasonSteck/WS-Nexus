//================== Context and Nesting tests ==================//
function expectProps(propNames) {
  expect(Object.getOwnPropertyNames(this).sort()).toEqual(propNames.sort());
}
beforeEach(function() {
  this.be1 = true;
});

it('can run an describe-less test', function() {
  expectProps.bind(this)(['be1']);
});

describe('contexts', function() {
  beforeEach(function() {
    expectProps.bind(this)(['be1']);
    this.be2 = true;
    expectProps.bind(this)(['be1','be2']);
  });

  afterEach(function() {
    expectProps.bind(this)(['be1','be2','be3','it','ae2']);
    this.ae1 = true;
    expectProps.bind(this)(['be1','be2','be3','it','ae2','ae1']);
  });

  describe('(even nested ones)', function() {
    beforeEach(function() {
      expectProps.bind(this)(['be1','be2']);
      this.be3 = true;
      expectProps.bind(this)(['be1','be2','be3']);
    });

    it('reference the same object', function() {
      expectProps.bind(this)(['be1','be2','be3']);
      this.it = true;
      expectProps.bind(this)(['be1','be2','be3','it']);
    });

    it('do not bleed between tests', function() {
      expectProps.bind(this)(['be1','be2','be3']);
      this.it = true;
      expectProps.bind(this)(['be1','be2','be3','it']);
    });

    afterEach(function() {
      expectProps.bind(this)(['be1','be2','be3','it']);
      this.ae2 = true;
      expectProps.bind(this)(['be1','be2','be3','it','ae2']);
    });
  });

  describe('(even other nested ones)', function() {
    beforeEach(function() {
      expectProps.bind(this)(['be1','be2']);
      this.be3 = true;
      expectProps.bind(this)(['be1','be2','be3']);
    });

    it('reference the same object', function() {
      expectProps.bind(this)(['be1','be2','be3']);
      this.it = true;
      expectProps.bind(this)(['be1','be2','be3','it']);
    });

    it('do not bleed between tests', function() {
      expectProps.bind(this)(['be1','be2','be3']);
      this.it = true;
      expectProps.bind(this)(['be1','be2','be3','it']);
    });

    afterEach(function() {
      expectProps.bind(this)(['be1','be2','be3','it']);
      this.ae2 = true;
      expectProps.bind(this)(['be1','be2','be3','it','ae2']);
    });
  });

  it('do not affect an `it` that comes after', function() {
    expectProps.bind(this)(['be1','be2']);
    this.be3 = this.it = this.ae2 = true;
    expectProps.bind(this)(['be1','be2','be3','it','ae2']);
  });
});

afterEach(function() {
  expect(this.be1).toBe(true);
});


//===================== Equalities =====================//
describe('expect', function() {
  describe('(object)', function() {
    describe('.toEqual', function() {
      it('to match similar objects', function() {
        let a = { val: 'hi' };
        let b = { val: 'hi' };
        expect(a).toEqual(b);
      });
    });
    describe('.toBe', function() {
      it('to match objects by identity', function() {
        let a = { val: 'hi' };
        let b = a;
        expect(a).toBe(b);
      });
    });
  });
  describe('(array)', function() {
    describe('.toEqual', function() {
      it('to match similar arrays', function() {
        let a = [1,2,3];
        let b = [1,2,3];
        expect(a).toEqual(b);
      });
    });
    describe('.toBe', function() {
      it('to match arrays by identity', function() {
        let a = [1,2,3];
        let b = a;
        expect(a).toBe(b);
      });
    });
  });
  describe('(function)', function() {
    describe('.toThrow', function() {
      it('to match a generic error', function() {
        expect(()=>{throw new Error('hi')}).toThrow(new Error('hi'));
      });
      it('to match a custom error', function() {
        function myError(message){this.name='myError'; this.message=message}
        myError.prototype = Object.create(Error.prototype);

        expect(()=>{throw new myError('hi')}).toThrow(new myError('hi'));
      });
    });
  });
});
