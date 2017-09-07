function nexusClient(nexusServer, autoConnectOptions) {
  if(!nexusServer) throw new Error('Missing nexusServer address');

  this._ws = new WebSocket(nexusServer);
  this._ws.onopen = () => {
    this.onServerConnect && this.onServerConnect();
    if(autoConnectOptions) {
      this._ws.send(JSON.stringify(Object.assign({
        type: 'CONNECT',
      }, autoConnectOptions)));
    }
  };
}