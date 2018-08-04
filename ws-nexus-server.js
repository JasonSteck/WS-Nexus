console.clear && console.clear();

const { Server } = require('./server');
const getParams = require('./server/utils/get-params.js');

const params = getParams(process.argv.slice(2));

global.SHOW_DEBUG_MESSAGES = true;
global.log = (...args) => {
  if(SHOW_DEBUG_MESSAGES) {
    console.log(...args);
  }
}

global.server = new Server(params.p); // for debug convenience
server.start();
