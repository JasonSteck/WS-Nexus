console.clear && console.clear();

const { Server } = require('./server');

global.SHOW_DEBUG_MESSAGES = true;
global.log = (...args) => {
  if(SHOW_DEBUG_MESSAGES) {
    console.log(...args);
  }
}

global.server = new Server(); // for debug convenience
server.start();
