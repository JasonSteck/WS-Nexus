console.clear && console.clear();

const { Server } = require('./server');
const getParams = require('./server/utils/get-params.js');
const loadCredentials = require('./server/utils/load-credentials.js');

const params = getParams(process.argv.slice(2));

global.SHOW_DEBUG_MESSAGES = true;
global.log = (...args) => {
  if(SHOW_DEBUG_MESSAGES) {
    console.log(...args);
  }
}

const port = params.p;
const credentials = loadCredentials(params.key, params.cert);

global.server = new Server({ port, credentials });
server.start();
