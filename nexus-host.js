function nexusHost(nexusServer, hostName, disableDefaultCallbacks=false) {
  if(!nexusServer) throw new Error('Missing nexusServer address');
  if(!hostName) throw new Error('Missing hostName');
  if(!disableDefaultCallbacks) this._setDefaultCallbacks();

  this.name = hostName;
  this.id = null;

  this._initialize(nexusServer);
}

/* ====================== Available Actions ====================== */

nexusHost.prototype.send = function(message, clientIDs=undefined) {
  this._ws.send(JSON.stringify({
    type: 'SEND',
    clientIDs,
    message,
  }));
};

nexusHost.prototype.close = function(code=1000, reason="Host closed their connection") {
  this._ws.close(code, reason);
}

/* ========================== Callbacks ========================== */

nexusHost.prototype._setDefaultCallbacks = function() {
  /* You can set any of these to null to have no callback */

  this.onRegistered = (hostID) => {
    /* example callback */
    console.log("+ Registered as host with id:", hostID);
  };
  this.onError = (event)=>{
    /* example callback */
    console.error("+ Nexus Error:", event);
  };
  this.onClose = (event)=>{
    /* example callback */
    console.warn("+ Connection Closed:", event);
  };
  this.onNewClient = (clientID, request)=>{
    /* example callback*/
    console.log("+ User #%s joined. Their connection request was:", clientID, request);
  };
  this.onClientMessage = (message, clientID)=>{
    /* example callback*/
    console.log("+ User #%s sent you:", clientID, message);
  };
  this.onClientLost = (clientID)=>{
    /* example callback*/
    console.log("+ User #%s disconnected", clientID);
  };
};


/* =================== (ignore the man behind the curtain, he's ugly) =================== */

nexusHost.prototype._initialize = function(nexusServer) {
  this._ws = new WebSocket(nexusServer);

  this._ws.onopen = () => {
    this._ws.send(JSON.stringify({
      type: 'HOST',
      hostName: this.name,
    }));
  };

  this._ws.onerror = (event) => (this.onError && this.onError(event));
  this._ws.onclose = (event) => (this.onClose && this.onClose(event));
  this._ws.onmessage = (event) => {
  //     console.log('Received:', event.data);
    const req = JSON.parse(event.data);
    switch(req.type) {
      case 'NEW_CLIENT':
        this.onNewClient && this.onNewClient(req.clientID, req.request);
        break;
      case 'FROM_CLIENT':
        this.onClientMessage && this.onClientMessage(req.message, req.clientID);
        break;
      case 'LOST_CLIENT':
        this.onClientLost && this.onClientLost(req.payload); // TODO change to req.clientID
        break;
      case 'REGISTERED':
        this.id = req.hostID;
        this.name = req.hostName; // use the name the server provides because that'll be the official name
        this.onRegistered && this.onRegistered(this.id, this.name);
        break;
      default:
        console.warn('Host #%s:"%s" could not parse type of response:', this.id, this.name, req);
    }
  };
}
