const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ---------------- GAME STATE ---------------- */
let players = {};

/* ---------------- SOCKET ---------------- */
io.on("connection", (socket) => {
  console.log("CONNECTED:", socket.id);

  players[socket.id] = {
    x: Math.random() * 800,
    y: Math.random() * 600,
    hp: 100
  };

  socket.emit("currentPlayers", players);
  socket.broadcast.emit("newPlayer", {
    id: socket.id,
    data: players[socket.id]
  });

  /* ---------------- INPUT MOVEMENT (FIXED) ---------------- */
  socket.on("move", (keys) => {
    const p = players[socket.id];
    if (!p) return;

    if (keys.w) p.y -= 4;
    if (keys.s) p.y += 4;
    if (keys.a) p.x -= 4;
    if (keys.d) p.x += 4;
  });

  /* ---------------- SHOOT ---------------- */
  socket.on("shoot", (bullet) => {
    if (!bullet) return;

    for (let id in players) {
      if (id === socket.id) continue;

      const p = players[id];

      const dx = p.x - bullet.x;
      const dy = p.y - bullet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 25) {
        p.hp -= 20;

        if (p.hp <= 0) {
          p.x = Math.random() * 800;
          p.y = Math.random() * 600;
          p.hp = 100;
        }
      }
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("removePlayer", socket.id);
  });
});

/* ---------------- STATE SYNC ---------------- */
setInterval(() => {
  io.emit("state", players);
}, 50);

/* ---------------- START ---------------- */
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
