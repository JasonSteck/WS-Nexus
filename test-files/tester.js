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

  function getErrorStack() {
    return (new Error()).stack.split('\n').slice(2,4).join('\n');
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

  window.expect = (actual) => {
    if(typeof actual === 'function') {
      return {
        toThrow: exception => {
          try {
            actual();
          } catch (err) {
            if(err == exception ||
              (err.name !== undefined &&
              err.message!== undefined &&
              err.name === exception.name &&
              isEqual(err.message, exception.message))) {
              currentTestResult.passExpectation();
              return;
            }
            currentTestResult.failExpectation(`Expected ${actual} \nto throw "${exception}"\n but got "${err}"`, getErrorStack());
            if(debugMode){
              consoleFailMessage(failMessage(currentTestResult));
              debugger;
            }
            return;
          }
          currentTestResult.failExpectation(`Expected ${actual} \nto throw "${exception}" but didn't get anything`, getErrorStack());
          if(debugMode){
            consoleFailMessage(failMessage(currentTestResult));
            debugger;
          }
        },
      }
    } else {
      return {
        toEqual: expected => {
          if(isEqual(actual,expected)){
            currentTestResult.passExpectation();
          } else {
            let a = getOutputFormat(actual);
            let b = getOutputFormat(expected);
            currentTestResult.failExpectation(`Expected ${a} \nto equal ${b}`, getErrorStack());
            if(debugMode){
              consoleFailMessage(failMessage(currentTestResult));
              debugger;
            }
          }
        },
        toBe: expected => {
          if(actual === expected){
            currentTestResult.passExpectation();
          } else {
            let a = getOutputFormat(actual);
            let b = getOutputFormat(expected);
            currentTestResult.failExpectation(`Expected ${a} \n   to be ${b}`, getErrorStack());
            if(debugMode){
              consoleFailMessage(failMessage(currentTestResult));
              debugger;
            }
          }
        },
      }
    }
  };

  function indentLines(lines, pad = '  '){
    let padding = '';
    return lines.map(desc => {
      return [padding+desc, padding+=pad][0];
    })
  }

  function failMessage(testResult) {
    let descriptions = indentLines(testResult.testPath).join('\n');
    return `${descriptions} \n${testResult.failReasons.join('\n')}`;
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
          consoleFailMessage(failMessage(result));
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

