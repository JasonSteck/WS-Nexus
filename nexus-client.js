function nexusClient(nexusServer, autoConnectOptions) {
  if(!nexusServer) throw new Error('Missing nexusServer address');
  this.nexusServer = nexusServer;
  this._isConnectedToHost = false;

  this._ws = new WebSocket(nexusServer);
  this._ws.onopen = () => {
    if(this._isConnectedToHost) return;
    this.onServerConnect && this.onServerConnect();
    if(autoConnectOptions) {
      this._ws.send(JSON.stringify(Object.assign({
        type: 'CONNECT',
      }, autoConnectOptions)));
    }
  };

  this._ws.onclose = (...args) => {
    this.onClose && this.onClose(...args);
  }

  this._ws.onmessage = (event) => {
    //     console.log('Received:', event.data);
    if(this._isConnectedToHost) {
      this.onMessage && this.onMessage(event.data);
    } else {
      const req = JSON.parse(event.data);
      switch(req.type) {
        case 'LIST':
          if(!this._isConnectedToHost) {
            this.onHostList && this.onHostList(req.payload);
          }
          break;
        case 'CONNECTED':
          if(!this._isConnectedToHost) {
            this._isConnectedToHost = true;
            this.onHostConnect && this.onHostConnect(req.payload);
          }
          break;
      }
    }
  };
}

nexusClient.prototype.setDefaultCallbacks = function() {
  /* You can set any of these to null to have no callback */

  this.onHostList = (hosts) => {
    /* example callback */
    console.log("+ Recieved list of hosts:");
    hosts.forEach(h=>{
      console.log('  %d: %s', h.hostID, h.hostName);
    });
  };

  this.onServerConnect = () => {
    /* example callback */
    console.log('+ Connected to nexus server.');
  };

  this.onHostConnect = (host) => {
    /* example callback */
    console.log('+ Connected to host:', host);
  };

  this.onMessage = (message) => {
    /* example callback */
    console.log('+ Recieved message:', message);
  };

  this.onClose = (...args) => {
    /* example callback */
    console.log('+ Client closed:', ...args);
  };
};

nexusClient.prototype.getHostList = function(callback) {
  if(this._isConnectedToHost) {
    throw new Error('Cannot get host list when connected to a host');
  }

  if(callback) {
    this.onHostList = callback;
  }
  this._ws.send(JSON.stringify({
    type: 'LIST',
  }))
};

nexusClient.prototype.connect = function(connectOptions, callback) {
  if(this._isConnectedToHost) {
    throw new Error('Cannot connect to a host: already connected to one');
  }

  if(callback) {
    this.onHostConnect = callback;
  }

  this._ws.send(JSON.stringify(Object.assign({},{
    type: 'CONNECT',
  }, connectOptions)));
}

nexusClient.prototype.send = function(msg) {
  if(!this._isConnectedToHost) {
    throw new Error('Must be connected to a host before you send anything');
  }
  this._ws.send(msg);
}

nexusClient.prototype.close = function() {
  this._ws.close();
}
