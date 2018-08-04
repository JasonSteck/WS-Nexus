(function() {

const $ = document.querySelector.bind(document);

let guestbook;

const serverInput = $('#server');
const connectButton = $('#connect');
const contentDiv = $('#content');
const nameList = $('#name-list');
const nameInput = $('#name-input');
const addButton = $('#add');
const status = $('#status');
const watcherContainer = $('#watcher-container');
const watchers = $('#watchers');

function onName(name) {
  const div = document.createElement('li');
  div.innerText = name;
  nameList.appendChild(div);
}

function onList(list) {
  // wipe out existing stuff
  nameList.innerHTML = "";
  list.forEach(onName);
}

function onServer() {
  serverInput.style.display = 'none';
  connectButton.style.display = 'none';
  contentDiv.style.display = '';
  nameList.innerHTML = '';
  nameInput.focus();

  status.innerText = "Connected";
}

function onLostServer() {
  serverInput.style.display = '';
  connectButton.style.display = '';
  contentDiv.style.display = 'none';

  status.innerText = "Lost connection to server";
  watcherContainer.style.display = 'none';
}

function onOfficialHost() {
  status.innerText = "You are the official Host!";
  watcherContainer.style.display = '';
}

function onUserCountChanged(count) {
  const others = count - 1;
  watchers.innerText = others;

  // Warn us if we're the last ones
  if(others) {
    window.onbeforeunload = null;
  } else {
    window.onbeforeunload = ()=>1;
  }
}

function connect() {
  guestbook = new Guestbook(serverInput.value, {
    onList,
    onName,
    onServer,
    onLostServer,
    onOfficialHost,
    onUserCountChanged,
  });
}

connectButton.onclick = connect;
serverInput.onkeydown = e => {
  if(e.key=='Enter') connect();
};

function add() {
  guestbook && guestbook.add(nameInput.value);
  nameInput.value = '';
  nameInput.focus();
}

addButton.onclick = add;
nameInput.onkeydown = e => {
  if(e.key=='Enter') add();
};


var regex = /[?&]([^=#]+)=([^&#]*)/g,
    url = window.location.href,
    params = {},
    match;
while(match = regex.exec(url)) {
    params[match[1]] = match[2];
}

if('server' in params) {
  serverInput.value = params.server;
}

})();
