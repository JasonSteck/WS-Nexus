function nexusHost(nexusServer, hostName, disableDefaultCallbacks=false) {
  if(!nexusServer) throw new Error('Missing nexusServer address');
  if(!hostName) throw new Error('Missing hostName');
  if(!disableDefaultCallbacks) this.setDefaultCallbacks();
  this.name = hostName;
  this.id = null;

  this._ws = new WebSocket(nexusServer);

  this._ws.onopen = () => {
    this._ws.send(JSON.stringify({
      type: 'HOST',
      hostName: hostName,
    }));
  };

  this._ws.onerror = (event) => (this.onError? this.onError(event) : undefined);
  this._ws.onclose = (event) => (this.onClose? this.onClose(event) : undefined);
  this._ws.onmessage = (event) => {
  //     console.log('Received:', event.data);
    const req = JSON.parse(event.data);
    switch(req.type) {
      case 'NEW_CLIENT':
        this.onNewClient && this.onNewClient(req.clientID, req.request);
        break;
      case 'FROM_CLIENT':
        this.onClientMessage && this.onClientMessage(req.clientID, req.payload);
        break;
      case 'LOST_CLIENT':
        this.onClientLost && this.onClientLost(req.payload); // TODO change to req.clientID
        break;
      case 'REGISTERED':
        this.id = req.hostID;
        this.name = req.hostName;
        this.onRegistered && this.onRegistered(this.id, this.name);
        break;
      default:
        console.warn('Host #%s:"%s" could not parse type of response:', this.id, this.name, req);
    }
  };

}

nexusHost.prototype.setDefaultCallbacks = function() {
  /* You can set any of these to null to have no callback */

  this.onRegistered = (hostID) => {
    /* example callback */
    console.log("+ Registered as host with id:", hostID);
  };
  this.onError = (event)=>{
    /* example callback */
    console.error('+ Nexus Error:', event);
  };
  this.onClose = (event)=>{
    /* example callback */
    console.warn('+ Connection Closed:', event);
  };
  this.onNewClient = (clientID, request)=>{
    /* example callback*/
    console.log("+ User #%s joined. Their connection request was:", clientID, request);
  };
  this.onClientMessage = (clientID, message)=>{
    /* example callback*/
    console.log("+ User #%s sent you:", clientID, message);
  };
  this.onClientLost = (clientID)=>{
    /* example callback*/
    console.log("+ User #%s disconnected", clientID);
  };
};

nexusHost.prototype.send = function(payload, clientID=undefined) {
  this._ws.send(JSON.stringify({
    type: 'SEND',
    clientID,
    payload,
  }));
};

nexusHost.prototype.close = function(code=1000, reason="Host closed their connection") {
  this._ws.close(code, reason);
}
