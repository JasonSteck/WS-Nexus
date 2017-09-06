function nexusHost(nexusServer, hostName, disableDefaultCallbacks=false) {
  if(!nexusServer) throw new Error('Missing nexusServer address');
  if(!hostName) throw new Error('Missing hostName');
  if(!disableDefaultCallbacks) this.setDefaultCallbacks();
  this.ws = new WebSocket(nexusServer);

  this.ws.onopen = () => {
    this.ws.send(JSON.stringify({
      type: 'HOST',
      payload: hostName,
    }));
  };

  this.ws.onerror = (event) => (this.onError? this.onError(event) : undefined);
  this.ws.onmessage = (event) => {
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
        this.onRegistered && this.onRegistered(req.hostID);
        break;
    }
  };

}

nexusHost.prototype.setDefaultCallbacks = function() {
  this.onRegistered = (hostID) => {
    /* example callback */
    console.log("+ Registered as host with id:", hostID);
  };
  this.onError = (event)=>{
    /* example callback */
    console.error('Nexus Error:', event);
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
  this.ws.send(JSON.stringify({
    type: 'SEND',
    clientID,
    payload,
  }));
};
