// Custom test suite (without webpack) by Jason Steck
(function(){
  let topContext = {
    descriptionChain: [],
    beforeEachChain: [],
    afterEachChain: [],
    its: [],
    describes: [],
    contexts: [],
  };
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


  // During tests
  let currentTest = [null, null];

  window.expect = (exp) => {

  };

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
      currentTest = test;
      context.beforeEachChain.forEach(be => be.call(obj));
      test[1].call(obj);
      context.afterEachChain.forEach(ae => ae.call(obj));
      currentTest = [null, null];
    });
    context.contexts.forEach(runContext)
  }

  window.runSpecs = () => {
    // parse specs
    parseContext(topContext);

    // run specs
    runContext(topContext);
  };
})();
