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
    describe('.not', function() {
      describe('.toEqual', function() {
        it('to not match similar objects', function() {
          let a = { val: 'foo' };
          let b = { val: 'bar' };
          expect(a).not.toEqual(b);
        });
      });
      describe('.toBe', function() {
        it('to not match objects by identity', function() {
          let a = { val: 'hi' };
          let b = { val: 'hi' };
          expect(a).not.toBe(b);
        });
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
    describe('.not', function() {
      describe('.toEqual', function() {
        it('to not match similar arrays', function() {
          let a = [1,2,3];
          let b = [4];
          expect(a).not.toEqual(b);
        });
      });
      describe('.toBe', function() {
        it('to not match arrays by identity', function() {
          let a = [1,2,3];
          let b = [1,2,3];
          expect(a).not.toBe(b);
        });
      });
    });
  });
  describe('(function)', function() {
    describe('.toThrow', function() {
      it('to match a generic error', function() {
        expect(() => { throw new Error('hi') }).toThrow(new Error('hi'));
      });
      it('to match a custom error', function() {
        function MyError(message){this.name='MyError'; this.message=message}
        MyError.prototype = Object.create(Error.prototype);

        expect(() => { throw new MyError('hi') }).toThrow(new MyError('hi'));
      });
      it('to match strings', function() {
        expect(() => { throw 'hi' }).toThrow('hi');
      });
    });
    describe('.not .toThrow', function() {
      it('still passes if the error message differs', function() {
        expect(() => { throw new Error('foo') }).not.toThrow(new Error('bar'));
      });
      it('still passes if the error names (types) differ', function() {
        function MyError(message){this.name='MyError'; this.message=message}
        MyError.prototype = Object.create(Error.prototype);

        expect(() => { throw new MyError('foo') }).not.toThrow(new MyError('bar'));
      });
      it('still passes if the thrown string differs', function() {
        expect(() => { throw 'foo' }).not.toThrow('bar');
      });
    });
  });
});

//===================== Spies =====================//
describe('stub(obj)', function() {
  describe('.method', function() {
    it('does not call the original method', function() {
      let called = false;
      let obj = { method: function(){ called = true }};
      stub(obj).method;
      obj.method();
      expect(called).toBe(false);
    });
    describe('[setup and teardown]', function() {
      let method = function(){};
      let obj = { method: method };
      it('replaces the method on the object', function() {
        let m = stub(obj).method;
        expect(obj.method).not.toBe(method);
        expect(obj.method).toBe(m);
      });
      it('restores the method after the test', function() {
        expect(obj.method).toBe(method);
      });
    });
    describe('= ()=>{...}', function() {
      it('calls through to the given function', function() {
        let obj = { method: function(){} };
        stub(obj).method = x=>x;
        expect(obj.method(5)).toBe(5);
      });
    });
    describe('= function(){...}', function() {
      it('maintains `this` context', function() {
        let obj = { method: x=>x, val: 4 };
        stub(obj).method = function(a) { return a + this.val };
        expect(obj.method(3)).toBe(7);
      });
    });
  });
});
