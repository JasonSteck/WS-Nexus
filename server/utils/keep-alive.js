function noop(){}



module.exports = function(ws) {
  let awake = true;

  ws.on('pong', () => awake = true);

  const id = setInterval(function ping() {
    if(!awake) return isAlive() && ws.terminate();

    awake = false;
    isAlive() && ws.ping(noop);
  }, 15000);

  function isAlive() {
    if(ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
      return true;
    }
    clearInterval(id);
    return false;
  }
};
