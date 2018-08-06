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
        case 'JOIN': //props: name AND/OR id AND/OR <anything>
          this._onJoinRequest(req);
          break;
        case 'HOST': //props: name
          this._onHostRequest(req);
          break;
        case 'JOIN_OR_HOST':
          this._onJoinOrHostRequest(req);
          break;
        case 'LIST':
          this._onListRequest(req);
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

  _onJoinRequest(req) {
    const success = this.options.onBecomeClient(this, {
      ws: this.ws,
      request: req,
    });

    if(success) {
      this.ws.removeListener('message', this.onMessage);
      this.ws.removeListener('close', this.onClose);
      return true;
    } else {
      this.ws.send(JSON.stringify({
        type: 'NO_SUCH_HOST',
        request: req,
      }));
      return false;
    }
  }

  _onHostRequest(req) {
    this.ws.removeListener('message', this.onMessage);
    this.ws.removeListener('close', this.onClose);

    this.options.onBecomeHost({
      ws: this.ws,
      request: req,
    });
  }

  _onJoinOrHostRequest(req) {
    const joined = this._onJoinRequest(req);
    if(!joined) {
      this._onHostRequest(req);
    }
  }

  _onListRequest(req) {
    this.ws.send(JSON.stringify({
      type: 'LIST',
      payload: this.options.getDisplayList(),
    }));
  }
}

module.exports = Visitor;
