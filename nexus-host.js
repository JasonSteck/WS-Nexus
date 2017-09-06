function newNexusHost(nexusServer, hostName) {
  if(!nexusServer) throw new Error('Missing nexusServer address');
  if(!hostName) throw new Error('Missing hostName');

  const pub = {};

  pub.onerror = (event)=>{
    /* example callback */
    console.error('Nexus Error:', event.data);
  };
  pub.onNewClient = (clientID, request)=>{
    /* example callback*/
    console.log("+ User #%s joined. Their connection request was:", clientID, request);
  };
  pub.onClientMessage = (clientID, message)=>{
    /* example callback*/
    console.log("+ User #%s sent you:", clientID, message);
  };
  pub.onClientLost = (clientID)=>{
    /* example callback*/
    console.log("+ User #%s disconnected", clientID);
  };

  const ws = pub.ws = new WebSocket(nexusServer);
  ws.onopen = () => {
    ws.send({
      type: 'HOST',
      payload: hostName,
    });
  };

  ws.onerror = (event) => (pub.onerror? pub.onerror(event) : undefined);
  ws.onmessage = function(event){
//     console.log('Received:', event.data);
    const req = JSON.parse(event.data);
    switch(req.type) {
      case 'NEW_CLIENT':
        pub.onNewClient && pub.onNewClient(req.clientID, req.request);
        break;
      case 'FROM_CLIENT':
        pub.onClientMessage && pub.onClientMessage(req.clientID, req.payload);
        break;
      case 'LOST_CLIENT':
        pub.onClientLost && pub.onClientLost(req.payload); // TODO change to req.clientID
        break;
    }
  };

  return pub;
}
