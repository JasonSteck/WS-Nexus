function NexusClient(nexusServer, autoConnectOptions) {
  if(!nexusServer) throw new Error('Missing nexusServer address');
  this.nexusServer = nexusServer;
  this.autoConnectOptions = autoConnectOptions;
  this._isConnectedToHost = false;

  this._initialize(nexusServer, autoConnectOptions);
}

/* ====================== Available Actions ====================== */

NexusClient.prototype.getHostList = function(callback) {
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

NexusClient.prototype.connect = function(connectOptions, callback) {
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

NexusClient.prototype.send = function(msg) {
  if(!this._isConnectedToHost) {
    throw new Error('Must be connected to a host before you send anything');
  }
  this._ws.send(msg);
}

NexusClient.prototype.close = function() {
  this._ws.close();
}

/* ========================== Callbacks ========================== */

NexusClient.prototype.setDefaultCallbacks = function() {
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

  this.onFailHostConnect = (host) => {
    /* example callback */
    console.log('+ Failed to connect to host:', host);
  };

  this.onMessage = (message) => {
    /* example callback */
    console.log('+ Recieved message:', message);
  };

  this.onClose = (code, reason) => {
    /* example callback */
    console.log('+ Client closed:', code, reason);
  };
};

/* =================== (ignore the man behind the curtain, he's ugly) =================== */

NexusClient.prototype._initialize = function(nexusServer, autoConnectOptions) {
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

  this._ws.onclose = (closeEvent) => {
    this.onClose && this.onClose(closeEvent.code, closeEvent.reason);
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
            this.onHostConnect && this.onHostConnect(req);
          }
          break;
        case 'NO_SUCH_HOST':
          this.onFailHostConnect && this.onFailHostConnect(req.request);
      }
    }
  };
}