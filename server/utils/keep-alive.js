function noop(){}

module.exports = function(ws) {
  let isAlive = true;

  ws.on('pong', () => isAlive = true);

  setInterval(function ping() {
    if(!isAlive) return ws.terminate();

    isAlive = false;
    ws.ping(noop);
  }, 15000);
};
