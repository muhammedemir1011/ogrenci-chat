const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const path = require("path");
const http = require("http");

const app = express();
const server = http.createServer(app);

// ====== AYARLAR ======
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "ogrenci-gizli",
    resave: false,
    saveUninitialized: false,
  })
);

// ====== STATIC ======
app.use(express.static("public"));

// ====== DATABASE ======
const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// ====== ROUTES ======

// Ana sayfa
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Chat sayfası (login şart)
app.get("/chat.html", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public", "chat.html"));
});

// KAYIT
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.send("Eksik bilgi");
  }

  const hash = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hash],
    (err) => {
      if (err) {
        return res.send("Kullanıcı adı zaten var");
      }
      req.session.user = username;
      res.redirect("/chat.html");
    }
  );
});

// GİRİŞ
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (!user) {
        return res.send("Kullanıcı yok");
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return res.send("Şifre yanlış");
      }

      req.session.user = user.username;
      res.redirect("/chat.html");
    }
  );
});

// MESAJLARI GETİR
app.get("/messages", (req, res) => {
  if (!req.session.user) return res.json([]);

  db.all(
    "SELECT username, message FROM messages ORDER BY id ASC",
    [],
    (err, rows) => {
      res.json(rows || []);
    }
  );
});

// MESAJ GÖNDER
app.post("/messages", (req, res) => {
  if (!req.session.user) return res.sendStatus(403);

  const message = req.body.message;
  if (!message) return res.sendStatus(400);

  db.run(
    "INSERT INTO messages (username, message) VALUES (?, ?)",
    [req.session.user, message],
    () => {
      res.sendStatus(200);
    }
  );
});

// ÇIKIŞ
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// ====== SERVER ======
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Sunucu çalışıyor: " + PORT);
});
