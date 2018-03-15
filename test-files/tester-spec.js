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

describe('tester-spec.js', function() {

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


//===================== Equalities =====================//
describe('expect', function() {
  describe('(anything)', function() {
    describe('.toExist', function() {
      it('passes if the thing is not null or undefined', function() {
        expect(0).toExist();
        expect('').toExist();
        expect({}).toExist();
      });
    });
    describe('.not .toExist', function() {
      it('passes if the thing is null or undefined', function() {
        expect(undefined).not.toExist();
        expect(null).not.toExist();
      });
    });
  });
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
    describe('.not .toEqual', function() {
      it('to not match similar objects', function() {
        let a = { val: 'foo' };
        let b = { val: 'bar' };
        expect(a).not.toEqual(b);
      });
    });
    describe('.not .toBe', function() {
      it('to not match objects by identity', function() {
        let a = { val: 'hi' };
        let b = { val: 'hi' };
        expect(a).not.toBe(b);
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
    describe('.not .toEqual', function() {
      it('to not match similar arrays', function() {
        let a = [1,2,3];
        let b = [4];
        expect(a).not.toEqual(b);
      });
    });
    describe('.not .toBe', function() {
      it('to not match arrays by identity', function() {
        let a = [1,2,3];
        let b = [1,2,3];
        expect(a).not.toBe(b);
      });
    });
  });
  describe('(function)', function() {
    describe('.toThrow()', function() {
      it('to match any error', function() {
        expect(() => { throw new Error('hi') }).toThrow();
      });
    });
    describe('.not .toThrow()', function() {
      it('passes if no error was thrown', function() {
        expect(() => {}).not.toThrow();
      });
    });
    describe('.toThrow(Error)', function() {
      it('to match a specific error', function() {
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
    describe('.not .toThrow(Error)', function() {
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
  describe('(spy)', function() {
    describe('.toHaveBeenCalled', function() {
      it('works if the spy was called', function() {
        let obj = { method: x=>x, val: 4 };
        stub(obj).method;
        obj.method();
        expect(obj.method).toHaveBeenCalled();
      });
    });
    describe('.not .toHaveBeenCalled', function() {
      it('works if the spy was not called', function() {
        let obj = { method: x=>x, val: 4 };
        stub(obj).method;
        expect(obj.method).not.toHaveBeenCalled();
      });
    });
    describe('.toHaveBeenCalledWith', function() {
      it('works if the spy was called with the right parameters', function() {
        let obj = { method: x=>x, val: 4 };
        stub(obj).method;
        obj.method(5);
        obj.method(3,4);
        obj.method(2);
        expect(obj.method).toHaveBeenCalledWith(3,4);
      });
    });
    describe('.not .toHaveBeenCalledWith', function() {
      it('works if the spy was not called with the right parameters', function() {
        let obj = { method: x=>x, val: 4 };
        stub(obj).method;
        obj.method(5);
        obj.method(3,4);
        obj.method(2);
        expect(obj.method).not.toHaveBeenCalledWith(3);
      });
    });
  });
});

//===================== Spies =====================//
describe('newSpy(name)', function() {
  describe('the returned spy', function() {
    let spy = newSpy('Detached spy');
    it('can expect to be called', function() {
      expect(spy).not.toHaveBeenCalled();
      spy(1,2,3);
      expect(spy).toHaveBeenCalledWith(1,2,3);
    });
    it('does not reset after tests', function() {
      expect(spy).toHaveBeenCalledWith(1,2,3);
    });
  });
});
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
      let obj = { method };
      it('replaces the method on the object', function() {
        stub(obj).method;
        expect(obj.method).not.toBe(method);
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
    describe('.toReturn', function() {
      it('returns the value instead', function() {
        let obj = { method: ()=>5 };
        stub(obj).method.toReturn(6);
        expect(obj.method()).toBe(6);
      });
    });
  });
});

//===================== Async Tests =====================//

describe('async test functions', () => {
  const delay = (ms=50) => new Promise(resolve => setTimeout(resolve, ms));

  describe('when multiple async tests are run', function() {
    let val = 0;
    it('the first can seemingly run synchronously', async function() {
      val++;
      await delay();
      expect(val).toBe(1);
      val++;
      await delay();
      expect(val).toBe(2);
      val++;
      await delay();
      expect(val).toBe(3);
      val++;
    });

    it('the second runs after the first', async function() {
      expect(val).toBe(4);
      val++;
      await delay();
      expect(val).toBe(5);
      val++;
    });

    it('the third runs after the second', async function() {
      expect(val).toBe(6);
      val++;
      await delay();
      expect(val).toBe(7);
    });
  })

  describe('when mixed with non async blocks', ()=>{
    let i = 0;

    beforeEach(async function() {
      i = 0;
      this.i = 10;

      expect(i).toBe(0);
      expect(this.i).toBe(10);
      await delay();
      expect(i).toBe(0);
      expect(this.i).toBe(10);
      i++;
      this.i++;
    });

    beforeEach(function() {
      expect(i).toBe(1);
      expect(this.i).toBe(11);
      i++;
      this.i++;
    });

    it('behaves in an orderly manner', async function(){
      expect(i).toBe(2);
      expect(this.i).toBe(12);
      await delay();
      expect(i).toBe(2);
      expect(this.i).toBe(12);
      i++;
      this.i++;
    });

    it('also behaves in an orderly manner', function(){
      expect(i).toBe(2);
      expect(this.i).toBe(12);
      i++;
      this.i++;
    });

    // Currently, all afterEach blocks are simply run in reverse so
    // this is actually the last thing to run in this describe block.
    afterEach(function() {
      expect(i).toBe(4);
      expect(this.i).toBe(14);
    });

    afterEach(async function() {
      expect(i).toBe(3);
      expect(this.i).toBe(13);
      await delay();
      expect(i).toBe(3);
      expect(this.i).toBe(13);
      i++;
      this.i++;
    });
  });
});

}); // end of describe('tester-spec',...