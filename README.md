# WS-Nexus
WebSocket-Nexus is essentially a WebSocket Proxy which allows browser windows to emulate the traditional client-server model.

To put it simply, it lets your browser talk with other browsers (i.e. networking for JavaScript developers.)

## API Wrapper (ws-nexus-user.js)

Included with the server code is an API wrapper that handles the WebSocket protocol and helps guide developers who want the use a WS-Nexus server.

### Cheatsheet
Below is a list of actions/events/states available for use. For an example on how to use them see [the example](#example-using-api-wrapper) below

### Always available
These properties are always available on any instance of a Nexus connection (e.g. result of `Nexus(...)` or `new NexusBase(...)`)

| Property | Description |
|---|---|
|.apiVersion| This wrapper's API Version. If you connect to a Nexus server that has an incompatable version you'll get a console warning.|
|.ignoreWarnings = true/false| If true, will not display any “Unhandled awaitableEvent” warnings. |
|.nexusServerAddress| Address of the WS-Nexus server that we're connected to (or tried to connect to).|
|.type| The type of this connection (User, Client, Host, or Dead) |
|.getHosts()| Requests a list of hosts connected to the same Nexus server. See `.onList` for listening for the result. |
|.close( reason="You closed your connection" )| Closes your WebSocket connection with the server. Can give a human readable reason for doing so.|
|.onClose( reason => {} )| [awaitableEvent](#awaitableevent): Adds the listener for when the connection gets closed (either by ourselves or the server/host we're connected to). |
|.onClose.then( reason => {} )| [awaitableEvent](#awaitableevent): Adds the one-time listener for when the connection gets closed (either by ourselves or the server/host we're connected to). |
|.onList( listOfHosts => {} )| [awaitableEvent](#awaitableevent): Adds the listener for when the server returns the list of current hosts. |
|.onList.then( listOfHosts => {} )| [awaitableEvent](#awaitableevent): Adds the one-time listener for when the server returns the list of current hosts. |
|.onServerInfo( info => {} )| [awaitableEvent](#awaitableevent): Adds the listener for when the server gives us information about itself (e.g. it's apiVersion).|
|.onServerInfo.then( info => {} )| [awaitableEvent](#awaitableevent): Adds the one-time listener for when the server gives us information about itself (e.g. it's apiVersion).|
|.whenHosting( hostInfo => {} , error => {} )| [awaitableState](#awaitablestate): Adds the success listener and/or the error listener for if/when we are a host.
|.whenHosting.then( hostInfo => {} )| [awaitableState](#awaitablestate): Adds the one-time success listener for if/when we are a host. |
|.whenHosting.onError( error => {} )| [awaitableState](#awaitablestate): Adds the one-time error listener for if/when we are no longer a host or if we fail to become one in the first place. |
|.whenJoined( hostInfo => {} , error => {} )| [awaitableState](#awaitablestate): Adds the success listener and/or the error listener for if/when we join a host as a client. |
|.whenJoined.then( hostInfo => {} )| [awaitableState](#awaitablestate): Adds the one-time success listener for if/when we join a host as a client. |
|.whenJoined.onError( error => {} )| [awaitableState](#awaitablestate): Adds the one-time error listener for if/when we lose connection to a host or if we fail to join one in the first place. |
|.whenServerConnected( () => {} , error => {} )| [awaitableState](#awaitablestate): Adds the success listener and/or the error listener for if/when we join a Nexus server. |
|.whenServerConnected.then( () => {} )| [awaitableState](#awaitablestate): Adds the one-time success listener for if/when we join a Nexus server. |
|.whenServerConnected.onError( error => {} )| [awaitableState](#awaitablestate): Adds the one-time error listener for if/when we lose connection to the a Nexus server or if we fail to join one in the first place. |

#### &lt;User&gt;
(connected to server, but not yet a client or host)

| Property | Description |
|---|---|
|.join(hostInfo)| Tries to join the first host that matches the given hostInfo. See [hostInfo]() for more details.|
|.host(hostInfo)| Tries to register as a host with the given hostInfo. See [hostInfo]() for more details, except you cannot request a specific host ID. |


#### &lt;Host&gt;
A host is a connection that clients can join.

| Property | Description |
|---|---|
| .id | The temporary ID of this host on the Nexus server. This value is `null` if we have not yet received confirmation that we're hosting from the server. |
| .name | The name of this host on the Nexus server. This value is `null` if we have not yet received confirmation that we're hosting from the server. |
| .clientIDs | An array of client IDs for the clients currently connected to you. |
| .send(json) | Sends the json to all connected clients. |
| .send(json, clientID) | Sends the json to the specific client. |
| .send(json, clientIDs) | Sends the json to each client in the array of clientIDs |
| .onNewClient( (clientID, request) => {} ) | [awaitableEvent](#awaitableevent): Adds the listener for when a new client connects to you. |
| .onNewClient.then( (clientID, request) => {} ) | [awaitableEvent](#awaitableevent): Adds the one-time listener for when a new client connects to you. |
| .onLostClient( clientID => {} ) | [awaitableEvent](#awaitableevent): Adds the listener for when a client disconnects from you. |
| .onLostClient.then( clientID => {} ) | [awaitableEvent](#awaitableevent): Adds the one-time listener for when a client disconnects from you. |
| .onMessage( (json, clientID) => {} ) | [awaitableEvent](#awaitableevent): Adds the listener for when a client sends you a message. |
| .onMessage.then( (json, clientID) => {} ) | [awaitableEvent](#awaitableevent): Adds the one-time listener for when a client sends you a message. |

#### &lt;Client&gt;
A client is a connection that has joined a host.

| Property | Description |
|---|---|
| .host | Holds the info of the host you're currently connected to. See [hostInfo]() for more details.|
| .send(json) | Send the json to the host. |
| .onMessage( json => {} )| [awaitableEvent](#awaitableevent): Adds the listener for when the host sends you a message. |
| .onMessage.then( json => {} )| [awaitableEvent](#awaitableevent): Adds the one-time listener for when the host sends you a message. |

### Example using API Wrapper
#### Echo Host

```js
const server = 'ws://127.0.0.1:3000'; // address of a WS-Nexus server
const host = Nexus(server).host('Echo Host');

host.onMessage((msg, id) => {
  console.log(`Client ${id} says:`, msg);
  host.send(msg, id);
});
```

#### Client

```js
const server = 'ws://127.0.0.1:3000'; // Same WS-Nexus server
const client = Nexus(server).join('Echo Host'); // Joins the oldest Echo Host

client.whenJoined(host => {
  client.send(`Hello ${host.name}`);
  client.send({ says: 'GREETINGS' }); // can send any serializable data
});

client.onMessage(msg => {
  console.log('Host says:', msg);
});
```

### "Unhandled awaitableEvent"

Using the above example code, you'll see a couple of warnings in the console:

```js
Unhandled awaitableEvent ".whenHosting.then": {type: "HOSTING", id: 116, name: "Echo Server"}
```
```js
Unhandled awaitableEvent "<Host>.onNewClient.then": 1 {name: "Echo Server", type: "JOIN"}
```

This kind of warning indicates there was an event that happened that you probably want to know about, but didn't set any listeners for it.

To handle them you can either use the callbacks indicated, e.g.
```js
host.whenHosting( hostInfo => {} )
host.onNewClient( (id, joinRequest) => {} )
```

Or you can ignore them:
```js
Nexus.ignoreWarnings = true; // all connections
// or //
host.ignoreWarnings = true; // just this host connection
```

Note: The [<Host>](#host) in the warning indicates the event is only available on host connections, and likewise, [<Client>](#client) for client connections. If neither are specified then you can use it on any type of nexus connection (e.g. before you even request to be a host or a client)

### API Wrapper Details

Because traditional event listeners and promises didn't quite cut it, I created two similar data structures called [awaitableEvent](#awaitableevent) and [awaitableState](#awaitablestate).

##### awaitableEvent
An `awaitableEvent` can be identified by the `on` prefix (e.g. `.onMessage`, `.onNewClient`, etc). The next time the event happens it will trigger all of its listeners in order, or if there aren't any then it may trigger a "Unhandled awaitableEvent" warning.

To add a listener:
```js
myConnection.onMessage( msg => console.log(msg) );
```

To add a listener that will only trigger once:
```js
myConnection.onMessage.then( msg => console.log(msg) );
```

##### awaitableState
An `awaitableState` can be identified by the `when` prefix (e.g. `.whenHosting`, `.whenJoined`, etc). This is similar to an [awaitableEvent](#awaitableevent) except it will immediately trigger new callbacks if the state has already been set (callbacks for [awaitableEvents](#awaitableevents) will only be triggered on the next event)
