const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const db = new sqlite3.Database("./database.db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.use(
  session({
    secret: "ogrenci-gizli",
    resave: false,
    saveUninitialized: false
  })
);

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`);

app.post("/register", async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  db.run(
    "INSERT INTO users (username, password) VALUES (?,?)",
    [req.body.username, hash],
    err => {
      if (err) return res.send("Kullanıcı adı alınmış");
      res.redirect("/chat.html");
    }
  );
});

app.post("/login", (req, res) => {
  db.get(
    "SELECT * FROM users WHERE username=?",
    [req.body.username],
    async (err, user) => {
      if (!user) return res.send("Kullanıcı yok");
      const ok = await bcrypt.compare(req.body.password, user.password);
      if (!ok) return res.send("Şifre yanlış");
      req.session.user = user.username;
      res.redirect("/chat.html");
    }
  );
});

// ---- SOCKET ----
const onlineUsers = {};

io.on("connection", socket => {
  socket.on("join", username => {
    onlineUsers[username] = socket.id;
    io.emit("users", Object.keys(onlineUsers));
  });

  socket.on("privateMessage", data => {
    const targetSocket = onlineUsers[data.to];
    if (targetSocket) {
      io.to(targetSocket).emit("privateMessage", data);
      socket.emit("privateMessage", data);
    }
  });

  socket.on("disconnect", () => {
    for (let user in onlineUsers) {
      if (onlineUsers[user] === socket.id) {
        delete onlineUsers[user];
      }
    }
    io.emit("users", Object.keys(onlineUsers));
  });
});

server.listen(3000, () =>
  console.log("✅ http://localhost:3000")
);
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Sunucu çalışıyor: " + PORT);
});
