(function() {

const $ = document.querySelector.bind(document);

let guestbook;
let listEmpty = true;

const serverInput = $('#server');
const connectButton = $('#connect');
const contentDiv = $('#content');
const nameList = $('#name-list');
const nameInput = $('#name-input');
const addButton = $('#add');

function onName(name) {
  if(listEmpty) {
    listEmpty = false;
    nameList.innerHTML = "";
  }
  const div = document.createElement('div');
  div.innerText = name;
  nameList.appendChild(div);

}

function onList(list) {
  list.forEach(onName);
}

function onServer() {
  serverInput.style.display = 'none';
  connectButton.style.display = 'none';
  contentDiv.style.display = '';
  nameInput.focus();
}

function onLostServer() {
  serverInput.style.display = '';
  connectButton.style.display = '';
  contentDiv.style.display = 'none';
}

function connect() {
  guestbook = new Guestbook(serverInput.value, {
    onList,
    onName,
    onServer,
    onLostServer,
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

})();
