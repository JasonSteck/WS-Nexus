// Custom test suite (without webpack) by Jason Steck
(function(){
  // Steal references so spies don't interfere
  const setTimeout = window.setTimeout;
  const clearTimeout = window.clearTimeout;

  const PASS = 1;
  const FAIL = 0;
  const NO_EXPECTATIONS = null;

  let topContext = {
    descriptionChain: [],
    beforeEachChain: [],
    afterEachChain: [],
    focused: { ref: true },
    its: [],
    describes: [],
    contexts: [],
  };

  let currentContext = topContext;
  let currentTest = null;
  let spies = [];

  /* should only be used during parse stage  */

  window.xdescribe = () => {};

  window.describe = (str, func) => {
    currentContext.describes.push([str, func, false]);
  };

  window.fdescribe = (str, func) => {
    currentContext.focused.ref = false;
    currentContext.describes.push([str, func, true]);
  }

  window.beforeEach = (func) => {
    currentContext.beforeEachChain.push(func);
  };

  window.xit = () => {};

  window.it = (name, func) => {
    if(typeof func !== 'function') throw new Error(`Missing function in 'it' block of "${name}"`);
    currentContext.its.push({ name, func });
  };

  window.fit = (name, func) => {
    currentContext.focused.ref = false;
    return window.it(name, func);
  };

  window.afterEach = (func) => {
    currentContext.afterEachChain.unshift(func);
  };


  /*  during tests  */
  let runningTests = false;
  let debugMode = false;

  function Then(test) {
    this.test = test;
    this.location = getErrorLocation();
  }

  // Used to implement async actions during tests
  window.then = (callback) => {
    if(runningTests) {
      const test = currentTest;
      const snippet = new Then(test);
      test.timeLine.stoppers.add(snippet);
      return () => {
        currentTest = test;
        currentContext = test.context;
        callback && callback.call(currentTest.objContext);
        test.timeLine.stoppers.remove(snippet);
      };
    }
    console.error(new Error("Cannot use 'then()' outside of test blocks!"));
    return ()=>{};
  };

  function Test(currentContext, testDefinition, spies) {
    this.objContext = {}; // new object context for each test
    this.context = currentContext;
    this.definition = testDefinition;
    this.result = new TestResultClass(testDefinition);
    this.spies = spies; // TODO get spies to work with pended/restored test contexts
    this.timeLine = new TimeLine(this);
  }

  function ResultsClass(onAllDone) {
    this.all = [];
    this.failed = [];
    this.noExpectations = [];
    this.doneCount = 0;
    this.doneStarting = false;
    this.onAllDone = onAllDone;
  }
  ResultsClass.prototype.finishIfDone = function() {
    if(this.doneStarting && this.doneCount >= this.all.length) {
      this.onAllDone && this.onAllDone();
    }
  };
  ResultsClass.prototype.trackResult = function (testResult){
    this.all.push(testResult);
    testResult.doneCallback(()=>this.recordResult(testResult))
  };
  ResultsClass.prototype.recordResult = function (testResult){
    if(testResult.result === FAIL) {
      this.failed.push(testResult);
    } else if(testResult.result === NO_EXPECTATIONS) {
      this.noExpectations.push(testResult);
    }
    this.doneCount++;
    this.finishIfDone();
  };
  ResultsClass.prototype.doneStartingTests = function() {
    this.doneStarting = true;
    this.finishIfDone();
  };

  function TestResultClass(test) {
    this.testPath = null;
    this.test = test;
    this.result = NO_EXPECTATIONS;
    this.failReasons = [];
    this.callbacks = [];

    this.testPath = currentContext.descriptionChain.slice(0);
    this.testPath.push(test.name);
  }
  TestResultClass.prototype.doneCallback = function(func) {
    if(this.result !== NO_EXPECTATIONS) {
      func(this.result, this.failReasons);
    } else {
      this.callbacks.push(func);
    }
  };
  TestResultClass.prototype.done = function() {
    this.callbacks.forEach(c=>c(this.result, this.failReasons));
  };
  TestResultClass.prototype.failExpectation = function(...reasons){
    this.result = FAIL;
    this.failReasons.push(reasons.join('\n'));
  };
  TestResultClass.prototype.passExpectation = function() {
    if(this.result === NO_EXPECTATIONS) {
      this.result = PASS;
    }
  };
  TestResultClass.prototype.didPass = function() {
    return this.result === PASS
  };

  /* After it begins receiving "then" blocks, it will stop working and
   * notify listeners when its list has been emptied.
   */
  function TimeStoppers() {
    this.isDead = false;
    this.blocks = [];
    this.callbacks = []; // Yeah, this could be done with Promises
  }

  TimeStoppers.prototype.clear = function() {
    if(this.blocks.length) throw new Error("Cannot clear timeLine! Something is weird!");
    this.isDead = false;
  };

  TimeStoppers.prototype.whenDone = function(callback) {
    if(this.isDead) {
      throw new Error('Cannot register callback after the section is done!');
    }

    this.callbacks.push(callback);
    this._checkDone();
  };

  TimeStoppers.prototype.add = function(block) {
    if(this.isDead) {
      throw new Error('Cannot start "then()" after the section is done!');
    }
    this.blocks.push(block);
  };

  TimeStoppers.prototype.remove = function(block) {
    if(this.isDead) {
      throw new Error('Cannot start "then()" after the section is done!');
    }
    const index = this.blocks.indexOf(block);
    if(index<0) {
      throw new Error('Cannot find "then()" block in list! Something weird is happening!');
    }
    this.blocks.splice(index,1);
    this._checkDone();
  };

  TimeStoppers.prototype._checkDone = function() {
    if(!this.blocks.length) {
      this.isDead = true;
      const toCall = this.callbacks;
      this.callbacks = [];
      toCall.forEach(c => c());
    }
  };

  TimeStoppers.prototype.getActive = function() {
    return this.blocks;
  };

  TimeStoppers.prototype.getActiveLocations = function() {
    return this.blocks.map(b => b.location);
  };

  /* Manages when each block of code in a series gets run. Using the 'then()'
   * command inside a block will make the series wait until
   * all of the Then callbacks have finished.
   */
  function TimeLine(test) {
    this.test = test;
    this.alive = true;
    this.i = 0;
    this.series = [];
    this.callback = [];
    this.stoppers = new TimeStoppers();
  }

  TimeLine.prototype.run = function(series, callback) {
    if(this.i !== 0) throw new Error('Cannot have two TimeLines running in a test! Something is weird!');
    this.series = series;
    this.callback = callback;
    this._runNextBlock();
  }

  TimeLine.prototype._runNextBlock = function() {
    if(!this.alive) return;
    currentContext = this.test.context;
    currentTest = this.test;
    if(this.i >= this.series.length) {
      this.i = 0;
      this.callback();
    } else {
      const block = this.series[this.i++];
      this.stoppers.clear();
      block.call(this.test.objContext);
      this.stoppers.whenDone(()=>{
        this._runNextBlock();
      });
    }
  }

  TimeLine.prototype.kill = function() {
    currentContext = this.test.context;
    currentTest = this.test;
    this.alive = false;

    const timeoutList = this.stoppers.getActiveLocations().map(l => '\n * '+l);
    const failMsg = "Async code that took too long:" + timeoutList;
    failWithConsole(failMsg, '');
  }

  let results = null;

  function getFileNameFromErrorLine(line) {
    return line.match(/(file:.*):\d+:\d+/)[1];
  }

  function getErrorLocation(error = new Error()) {
    const errorLines = error.stack.split('\n');
    const currentFile = getFileNameFromErrorLine(errorLines[1]);
    for(let i=2;i<errorLines.length;i++) {
      let file = getFileNameFromErrorLine(errorLines[i]);
      if(file !== currentFile) {
        return errorLines[i];
      }
    }

    return errorLines.slice(5,6).join('\n'); //fallback
  }

  function failWithConsole(msg, errorStack = getErrorLocation()) {
    currentTest.result.failExpectation(msg, errorStack);
    if(debugMode){
      consoleFailMessage(failMessage(currentTest.result));
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
      currentTest.result.passExpectation();
    } else {
      let a = getOutputFormat(actual);
      let b = getOutputFormat(expected);
      currentTest.result.failExpectation(`Expected ${a} \nto equal ${b}`, getErrorLocation());
      if (debugMode) {
        consoleFailMessage(failMessage(currentTest.result));
        debugger;
      }
    }
  }

  function toExist(actual, not) {
    if((actual != null) ^ not) {
      currentTest.result.passExpectation();
    } else {
      let notStr = not? 'not ' : '';
      if(failWithConsole(`Expected "${actual}" \nto ${notStr}exist`))
        debugger;
    }
  }

  function toBe(actual, expected, not) {
    if((actual === expected) ^ not){
      currentTest.result.passExpectation();
    } else {
      let a = getOutputFormat(actual);
      let b = getOutputFormat(expected);
      currentTest.result.failExpectation(`Expected "${a}" \n   to be ${b}`, getErrorLocation());
      if(debugMode){
        consoleFailMessage(failMessage(currentTest.result));
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
        currentTest.result.passExpectation();
      }
    } else {
      if(correctlyThrew) {
        currentTest.result.passExpectation();
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
      currentTest.result.passExpectation();
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
      currentTest.result.passExpectation();
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
    console.log('%cFailure:', 'color: red; font-weight: bold;');
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
        focused: desc[2]? { ref: true } : prevContext.focused,
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
    currentContext = context; // this is, in fact, used elsewhere
    if(currentContext.focused.ref) { // if our context is focused
      currentContext.its.forEach(runTest);
    }

    currentContext.contexts.forEach(runContext);
  }

  function runTest(testDefinition) {
    const test = currentTest = new Test(currentContext, testDefinition, spies)

    results.trackResult(test.result);

    const allBlocks = [
      ...currentContext.beforeEachChain,
      testDefinition.func,
      ...currentContext.afterEachChain,
    ];

    const timeLimitId = setTimeout(function() {
      test.timeLine.kill();
      _postTest(test.objContext);
    }, 1000);

    test.timeLine.run(allBlocks, function () {
      clearTimeout(timeLimitId);
      _postTest(test.objContext);
    });
  }

  function _postTest(objContext) {
    // framework context should already be restored, if needed
    if(currentTest.result.didPass()) {
      console.log('Passed: %s', currentTest.result.testPath.join(' '));
    }
    currentTest.result.done();

    spies.forEach(s => {
      if(s.object) {
        s.object[s.methodName] = s.originalFunc;
      } else {
        // This is a detached spy
      }
    });
    spies = [];
  }

  function onAllDone() {
    runningTests = false;

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
      console.log('\nTests Finished: %d Successes%s / %d Test%s', total, totalPlural, total, totalPlural);
    }
    if(results.noExpectations.length > 0) {
      results.noExpectations.forEach(result => {
        console.warn('No Expectations in: \n%s', indentLines(result.testPath).join('\n'), result.test.func);
      });
    }

    return results;
  }

  window.runSpecs = (options) => {
    debugMode = options.debug;
    results = new ResultsClass(onAllDone);
    // parse specs
    parseContext(topContext);

    // run specs
    runningTests = true;
    runContext(topContext);

    console.log('Waiting for Async Tests to Finish...');

    results.doneStartingTests();
  };
})();
