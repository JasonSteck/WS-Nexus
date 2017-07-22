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
    currentContext.its.push([str, func]);
  };

  window.afterEach = (func) => {
    currentContext.afterEachChain.unshift(func);
  };


  /*  during tests  */
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
    this.test = test;
    this.result = NO_EXPECTATIONS;
    this.failReasons = [];
  }
  TestResultClass.prototype.failExpectation = function(reason, stack){
    this.result = FAIL;
    this.failReasons.push(reason+'. stack:'+stack);
  };
  TestResultClass.prototype.passExpectation = function() {
    if(this.result === NO_EXPECTATIONS) {
      this.result = PASS;
    }
  };

  let results = null;
  let currentTestResult = null;

  window.expect = (exp) => {
    return {
      toEqual: other => {
        if(exp == other){
          currentTestResult.passExpectation();
        } else {
          currentTestResult.failExpectation(`Expected ${exp} to equal ${other}`, (new Error()).stack);
        }
      },
      toBe: other => {
        if(exp === other){
          currentTestResult.passExpectation();
        } else {
          currentTestResult.failExpectation(`Expected ${exp} to be ${other}`, (new Error()).stack);
        }
      },
    }
  };

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

  window.runSpecs = () => {
    results = new ResultsClass();
    // parse specs
    parseContext(topContext);

    // run specs
    runContext(topContext);
    if(results.noExpectations.length > 0) {
      results.noExpectations.forEach(result => {
        console.log('No Expectations: ', result.test);
      });
    } else if(results.failed.length > 0) {
      results.failed.forEach(result => {
        console.log('Failed: ', result);
      });
    } else {
      results.all.forEach( result => {
        console.log('Passed: ', result.test[0]);
      })
    }
    return results;
  };
})();
