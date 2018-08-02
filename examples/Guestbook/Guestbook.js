class Guestbook {
  constructor(server='ws://127.0.0.1:3000', { onList, onName, onServer, onLostServer, onOfficialHost }) {
    this.server = server;
    this.onList = onList;
    this.onName = onName;
    this.onOfficialHost = onOfficialHost;

    this.list = [];
    this.isOfficialHost = false;

    this.host = Nexus(server).host('Guestbook');

    // setup event listeners
    this.host.onNewClient(id => this.onNewConnection(id));
    this.host.onMessage((name, id) => this.onNewName(name, id));
    // make sure we're hosting before we try to join anything (so we can join ourselves)
    this.host.whenHosting.then(() => this.joinGuestbook());

    this.host.whenServerConnected.then(onServer);
    this.host.onClose.then(onLostServer);
  }

  add(name) {
    this.client.send(name);
  }

  /* ================= Host functions ================= */

  onNewConnection(id) {
    console.log('New client (#%d) joined.', id);
    // send the list to the new client
    this.host.send(this.list, id);
  }

  onNewName(name, id) {
    // sanitize input
    if(typeof name !== 'string') return;
    if(name.length === 0) return;

    console.log('(#%d)', id, name);

    if(this.isOfficialHost) {
      this.list.push(name);
      this.onName(name);
      this.host.send(name); // send new value to everyone
    } else {
      // forward request to official host
      this.client.send(name);
    }
  }

  /* ================= Client functions ================= */

  joinGuestbook() {
    this.client = Nexus(this.server);
    this.client.whenServerConnected.then(()=>{
      this.client.join('Guestbook');

      // setup event listeners
      this.client.whenJoined.then(hostType => this.onJoined(hostType));
      this.client.onMessage(nameOrList => this.onUpdate(nameOrList));
      this.client.onClose(() => this.onOtherHostClosed());
    });
  }

  onJoined(hostType) {
    if(hostType.id === this.host.id) {
      // if we joined ourselves, then we know we're at the top of the list, and thus the offical host
      this.isOfficialHost = true;
      console.log('You are the official Guestbook host!');
      this.onOfficialHost();
    } else {
      console.log('Joined host #' + hostType.id);
    }
  }

  onOtherHostClosed() {
    console.log('Lost connection to host.');
    // if we lose connection to a host, join another!
    this.joinGuestbook();
  }

  onUpdate(nameOrList) {
    if(!this.isOfficialHost) {
      // when we get an update to the Guestbook
      console.log('New name(s):', nameOrList);

      if(Array.isArray(nameOrList)) {
        this.list = nameOrList;
        this.onList(nameOrList);
      } else {
        this.list.push(nameOrList);
        this.onName(nameOrList);
      }

      this.host.send(nameOrList); // forward list to anyone connected to us
    }
  }
}
