function newNexusHost(nexusServer, hostName) {
  if(!nexusServer) throw new Error('Missing nexusServer address');
  if(!hostName) throw new Error('Missing hostName');

  const pub = {};

  pub.onerror = (event)=>{
    /* example callback */
    console.error('Nexus Error:', event.data);
  };
  pub.onNewClient = (clientID, clientRequest)=>{
    /* example callback*/
    console.log("User #%s joined. Their connection request was:", clientID, request);
  };

  const ws = pub.ws = new WebSocket(nexusServer);
  ws.onopen = () => {
    ws.send({
      type: 'HOST',
      payload: hostName,
    });
  }

  ws.onerror = (event) => (pub.onerror? pub.onerror(event) : undefined);

  return pub;
}
