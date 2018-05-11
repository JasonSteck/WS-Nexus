class Visitor {
  // options: { onBecomeClient, onBecomeHost }
  constructor(ws, options) {
    this.ws = ws;
    this.options = options;

    this.onMessage = this.onMessage.bind(this);
    this.onClose = this.onClose.bind(this);
    ws.on('message', this.onMessage);
    ws.on('close', this.onClose);
  }

  onMessage(str) {
    try {
      log('+ request from Visitor:', str);
      const req = JSON.parse(str);
      switch(req.type) {
        case 'CONNECT': //props: hostName AND/OR hostID AND/OR <anything>
          this._onConnect(req);
          break;
        case 'HOST': //props: hostName
          this._onHost(req);
          break;
        case 'LIST':
          this._onList(req);
          break;
        default:
          log('Unknown request type:', req.type, 'for:', req);
      }
    } catch (e) {
      log('ERROR onMessage: ',e,'\n- Trying to Process: `'+str+'`');
    }
  }

  onClose() {
    log('* Lost Visitor Connection');
  }

  _onConnect(req) {
    const success = this.options.onBecomeClient(this, {
      ws: this.ws,
      request: req,
    });

    if(success) {
      this.ws.removeListener('message', this.onMessage);
      this.ws.removeListener('close', this.onClose);
    } else {
      this.ws.send(JSON.stringify({
        type: 'NO_SUCH_HOST',
        request: req,
      }));
    }
  }

  _onHost(req) {
    this.ws.removeListener('message', this.onMessage);
    this.ws.removeListener('close', this.onClose);

    this.options.onBecomeHost(this, {
      ws: this.ws,
      request: req,
    });
  }

  _onList(req) {
    this.ws.send(JSON.stringify({
      type: 'LIST',
      payload: this.options.getDisplayList(),
    }));
  }
}

module.exports = Visitor;
