// Custom test suite (without webpack) by Jason Steck
(function(){
  const PASS = 1;
  const FAIL = 0;
  const NO_EXPECTATIONS = -1;

  let topContext = {
    descriptionChain: [],
    beforeEachChain: [],
    afterEachChain: [],
    its: [],
    describes: [],
    contexts: [],
  };
  /*  during setup  */
  let currentContext = topContext;

  window.describe = (str, func) => {
    currentContext.describes.push([str, func]);
  };

  window.beforeEach = (func) => {
    currentContext.beforeEachChain.push(func);
  };

  window.it = (str, func) => {
    if(typeof func !== 'function') throw new Error(`Missing function in 'it' block of "${str}"`);
    currentContext.its.push([str, func]);
  };

  window.afterEach = (func) => {
    currentContext.afterEachChain.unshift(func);
  };


  /*  during tests  */
  let debugMode = false;
  let spies = [];

  function ResultsClass() {
    this.all = [];
    this.failed = [];
    this.noExpectations = [];
  }
  ResultsClass.prototype.addResult = function (testResult){
    this.all.push(testResult);
    if(testResult.result === FAIL) {
      this.failed.push(testResult);
    } else if(testResult.result === NO_EXPECTATIONS) {
      this.noExpectations.push(testResult);
    }
  };

  function TestResultClass(test) {
    this.testPath = null;
    this.test = test;
    this.result = NO_EXPECTATIONS;
    this.failReasons = [];

    this.testPath = currentContext.descriptionChain.slice(0);
    this.testPath.push(test[0]);
  }
  TestResultClass.prototype.failExpectation = function(reason, stack){
    this.result = FAIL;
    this.failReasons.push(reason+'\n'+stack);
  };
  TestResultClass.prototype.passExpectation = function() {
    if(this.result === NO_EXPECTATIONS) {
      this.result = PASS;
    }
  };

  let results = null;
  let currentTestResult = null;

  function getFileNameFromErrorLine(line) {
    return line.match(/\((.*):\d+:\d+\)/)[1];
  }

  function getErrorStack() {
    let errorLines = (new Error()).stack.split('\n');
    let currentFile = getFileNameFromErrorLine(errorLines[1]);
    for(let i=2;i<errorLines.length;i++) {
      let file = getFileNameFromErrorLine(errorLines[i]);
      if(file !== currentFile) {
        return errorLines[i];
      }
    }

    return errorLines.slice(5,6).join('\n'); //fallback
  }
  window.err = getErrorStack;

  function failWithConsole(msg) {
    currentTestResult.failExpectation(msg, getErrorStack());
    if(debugMode){
      consoleFailMessage(failMessage(currentTestResult));
      return true;
    }
    return false;
  }

  function isEqual(a,b) {
    if(typeof a !== typeof b) return false;
    if(a === Object(a)){
      return objectsEqual(a,b);
    } else if(Array.isArray(a)) {
      return arraysEqual(a,b)
    } else {
      return a == b;
    }
  }

  function objectsEqual(a, b) {
    let aProps = Object.getOwnPropertyNames(a);
    let bProps = Object.getOwnPropertyNames(b);

    if (aProps.length !== bProps.length) return false;

    for (let i = 0; i < aProps.length; i++) {
      let propName = aProps[i];

      if (!isEqual(a[propName], b[propName])) {
        return false;
      }
    }
    return true;
  }

  function arraysEqual(a, b) {
    if (a === b) return true;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function getOutputFormat(exp) {
    if(typeof exp === 'function') {
      return exp.toString();
    }
    return JSON.stringify(exp);
  }

  function toEqual(actual, expected, not) {
    if(isEqual(actual,expected) ^ not){
      currentTestResult.passExpectation();
    } else {
      let a = getOutputFormat(actual);
      let b = getOutputFormat(expected);
      currentTestResult.failExpectation(`Expected ${a} \nto equal ${b}`, getErrorStack());
      if (debugMode) {
        consoleFailMessage(failMessage(currentTestResult));
        debugger;
      }
    }
  }

  function toExist(actual, not) {
    if((actual != null) ^ not) {
      currentTestResult.passExpectation();
    } else {
      let notStr = not? 'not ' : '';
      if(failWithConsole(`Expected "${actual}" \nto ${notStr}exist`))
        debugger;
    }
  }

  function toBe(actual, expected, not) {
    if((actual === expected) ^ not){
      currentTestResult.passExpectation();
    } else {
      let a = getOutputFormat(actual);
      let b = getOutputFormat(expected);
      currentTestResult.failExpectation(`Expected "${a}" \n   to be ${b}`, getErrorStack());
      if(debugMode){
        consoleFailMessage(failMessage(currentTestResult));
        debugger;
      }
    }
  }

  function toThrow(actual, exception, not) {
    let threw = false;
    let correctlyThrew = false;
    let error = null;
    let anyException = exception === undefined;
    try {
      actual();
    } catch (err) {
      error = err;
      if(err == exception ||
        anyException ||
        (err.name !== undefined &&
        err.message!== undefined &&
        err.name === exception.name &&
        isEqual(err.message, exception.message))) {

        correctlyThrew = true;
      }
      threw = true;
    }
    exceptionStr = anyException? 'an error': `"${exception}"`;
    if(not) {
      if(correctlyThrew) {
        if(failWithConsole(`Expected ${actual} \nnot to throw ${exceptionStr}\n but it did`))
          debugger;
      } else {
        currentTestResult.passExpectation();
      }
    } else {
      if(correctlyThrew) {
        currentTestResult.passExpectation();
      } else if(threw) {
        let notString = not?'not':'';
        if(failWithConsole(`Expected ${actual} \n${notString}to throw ${exceptionStr}\n but got "${error}"`))
          debugger;
      } else {
        if(failWithConsole(`Expected ${actual} \nto throw ${exceptionStr} but didn't get anything`))
          debugger;
      }
    }
  }

  function toHaveBeenCalled(actual, not) {
    if(!(actual && typeof actual==='function' && actual._isSpy)) {
      let msg = `Error: cannot expect "${actual && actual.methodName}" toHaveBeenCalled. It is not a spy.`;
      if(failWithConsole(msg)) {
        debugger;
      } else {
        throw new Error(msg);
      }
    }

    if((actual.calls.length > 0) ^ not) {
      currentTestResult.passExpectation();
    } else {
      if(failWithConsole(`Expected "${actual.methodName}" \nto have been called, but it wasn't`))
        debugger;
    }
  }

  function toHaveBeenCalledWith(actual, expected, not) {
    if(!(actual && typeof actual==='function' && actual._isSpy)) {
      let msg = `Error: cannot expect "${actual && actual.methodName}" toHaveBeenCalled. It is not a spy.`;
      if(failWithConsole(msg)) {
        debugger;
      } else {
        throw new Error(msg);
      }
    }

    let found = false;
    for(let i=0; i<actual.calls.length; i++) {
      let call = actual.calls[i];
      if(call.length === expected.length) {
        found = found || isEqual(call, expected);
      } 
    }
    
    if(found ^ not) {
      currentTestResult.passExpectation();
    } else {
      if(found) {
        if(failWithConsole(`Expected "${actual.methodName}" \nto not have been called with "${expected}" but actual calls were:\n${actual.calls.join('\n')}`))
          debugger;
      } else {
        if(failWithConsole(`Expected "${actual.methodName}" \nto have been called with "${expected}" but actual calls were:\n${actual.calls.join('\n')}`))
          debugger;
      }
    }

  }

  window.expect = (actual) => {
    return {
      not: {
        toHaveBeenCalledWith: (...expected) => toHaveBeenCalledWith(actual, expected, true),
        toHaveBeenCalled: () => toHaveBeenCalled(actual, true),
        toThrow: expected => toThrow(actual, expected, true),
        toEqual: expected => toEqual(actual, expected, true),
        toExist: () => toExist(actual, true),
        toBe: expected => toBe(actual, expected, true),
      },
      toHaveBeenCalledWith: (...expected) => toHaveBeenCalledWith(actual, expected, false),
      toHaveBeenCalled: () => toHaveBeenCalled(actual, false),
      toThrow: exception => toThrow(actual, exception, false),
      toEqual: expected => toEqual(actual, expected, false),
      toExist: () => toExist(actual, false),
      toBe: expected => toBe(actual, expected, false),
    }
  };

  function ensureSpy(str, obj) {
    if(!(obj && obj[str] && obj[str]._isSpy)) {
      return obj[str] = newSpyGuy(str, obj);
    }
    return obj[str];
  }

  function newSpyGuy(str, obj) {
    function spyGuy(...args){
      self.calls.push(args);
      let returnValue = undefined;
      if(self.callFake) {
        returnValue = self.callFake.apply(this, args);
      }
      if(self.returnValue) {
        returnValue = self.returnValue;
      }
      return returnValue;
    }
    let self = spyGuy;
    spyGuy._isSpy = true;
    spyGuy.calls = [];
    spyGuy.methodName = str;
    spyGuy.object = obj;
    spyGuy.originalFunc = obj && obj[str];
    spyGuy.callFake = null;
    spyGuy.returnValue = null;

    spies.push(spyGuy);
    return spyGuy;
  }

  window.newSpy = name => newSpyGuy(name);

  window.stub = function(obj) {
    return new Proxy({}, {
      get: function(_, str) {
        let spyGuy = ensureSpy(str, obj);
        function spyHandler(){}
        spyHandler.toReturn = val => {
          spyGuy.returnValue = val;
          return spyHandler;
        };
        spyHandler.spy = spyGuy;
        return spyHandler;
      },
      set: function(_, str, val){
        ensureSpy(str, obj);
        if(typeof val === 'function') {
          obj[str].callFake = val;
        }
      },
    });
  };

  function indentLines(lines, pad = '  '){
    let padding = '';
    return lines.map(desc => {
      return [padding+desc, padding+=pad][0];
    })
  }

  function failMessage(testResult, showAllLines) {
    let failReasons = testResult.failReasons;
    if(!showAllLines) {
      failReasons = [failReasons[failReasons.length-1]];
    }
    let descriptions = indentLines(testResult.testPath).join('\n');
    return `${descriptions} \n${failReasons.join('\n')}`;
  }

  function consoleFailMessage(msg) {
    console.log('%c Failure:', 'color: red; font-weight: bold;');
    console.log(msg);
  }

  /*  spec execution  */
  function parseContext(context) {
    let prevContext = currentContext;
    context.describes.forEach(desc => {
      let newContext = {
        descriptionChain: context.descriptionChain.slice(0),
        beforeEachChain: context.beforeEachChain.slice(0),
        afterEachChain: context.afterEachChain.slice(0),
        its: [],
        describes: [],
        contexts: [],
      };
      newContext.descriptionChain.push(desc[0]);
      context.contexts.push(newContext);
      currentContext = newContext;
      desc[1]();
      parseContext(newContext);
    });
    currentContext = prevContext;
  }

  function runContext(context) {
    currentContext = context;
    context.its.forEach(test => {
      let obj = {};
      currentTestResult = new TestResultClass(test);
      context.beforeEachChain.forEach(be => be.call(obj));
      test[1].call(obj);
      context.afterEachChain.forEach(ae => ae.call(obj));
      results.addResult(currentTestResult);
      currentTestResult = null;

      spies.forEach(s => {
        if(s.object) {
          s.object[s.methodName] = s.originalFunc;
        } else {
          // This is a detached spy
        }
      });
      spies = [];
    });
    context.contexts.forEach(runContext)
  }

  window.runSpecs = (debug) => {
    debugMode = debug;
    results = new ResultsClass();
    // parse specs
    parseContext(topContext);

    // run specs
    runContext(topContext);

    let total = results.all.length;
    let totalPlural = total===1? '' : 's';

    if(results.failed.length > 0) {
      results.failed.forEach(result => {
        if(!debugMode) {
          consoleFailMessage(failMessage(result, true));
        }
      });
      let failCount = results.failed.length;
      console.log('\nTests Finished: %d Failure%s / %d Test%s', failCount, failCount===1?'':'s', total, totalPlural);
    } else {
      results.all.forEach( result => {
        console.log('Passed: %s', result.testPath.join(' '));
      });
      console.log('\nTests Finished: %d Successes%s / %d Test%s', total, totalPlural, total, totalPlural);
    }
    if(results.noExpectations.length > 0) {
      results.noExpectations.forEach(result => {
        console.warn('No Expectations in: \n%s', indentLines(result.testPath).join('\n'), result.test[1]);
      });
    }

    return results;
  };
})();

