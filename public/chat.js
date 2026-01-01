const socket = io();
let selectedUser = null;
const username = prompt("Kullanıcı adını tekrar yaz:");

socket.emit("join", username);

socket.on("users", users => {
  const ul = document.getElementById("userList");
  ul.innerHTML = "";
  users.forEach(u => {
    if (u !== username) {
      const li = document.createElement("li");
      li.textContent = u;
      li.onclick = () => selectUser(u);
      ul.appendChild(li);
    }
  });
});

function selectUser(user) {
  selectedUser = user;
  document.getElementById("chatTitle").textContent =
    "💬 " + user;
  document.getElementById("messages").innerHTML = "";
}

function send() {
  if (!selectedUser) return alert("Kullanıcı seç");
  const msg = document.getElementById("msg").value;
  socket.emit("privateMessage", {
    from: username,
    to: selectedUser,
    text: msg
  });
  document.getElementById("msg").value = "";
}

socket.on("privateMessage", data => {
  if (
    data.from === selectedUser ||
    data.from === username
  ) {
    const div = document.createElement("div");
    div.textContent = data.from + ": " + data.text;
    document.getElementById("messages").appendChild(div);
  }
});
