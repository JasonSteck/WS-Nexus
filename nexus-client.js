function nexusClient(nexusServer, autoConnectOptions) {
  if(!nexusServer) throw new Error('Missing nexusServer address');
  this.nexusServer = nexusServer;

  this._ws = new WebSocket(nexusServer);
  this._ws.onopen = () => {
    this.onServerConnect && this.onServerConnect();
    if(autoConnectOptions) {
      this._ws.send(JSON.stringify(Object.assign({
        type: 'CONNECT',
      }, autoConnectOptions)));
    }
  };

  this._ws.onmessage = (event) => {
  //     console.log('Received:', event.data);
    const req = JSON.parse(event.data);
    switch(req.type) {
      case 'LIST':
        this.onHostList && this.onHostList(req.payload);
        break;
      case 'CONNECTED':
        this.onHostConnect && this.onHostConnect();
        break;
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
};

nexusClient.prototype.getHostList = function(callback) {
  if(callback) {
    this.onHostList = callback;
  }
  this._ws.send(JSON.stringify({
    type: 'LIST',
  }))
};

nexusClient.prototype.connect = function(connectOptions, callback) {
  if(callback) {
    this.onHostConnect = callback;
  }

  this._ws.send(JSON.stringify(Object.assign({},{
    type: 'CONNECT',
  }, connectOptions)));
}