const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ---------------- STATE ---------------- */
let players = {};

/* ---------------- SOCKET ---------------- */
io.on("connection", (socket) => {
  console.log("CONNECTED:", socket.id);

  players[socket.id] = {
    x: Math.random() * 800,
    y: Math.random() * 600,
    hp: 100
  };

  socket.emit("init", players);

  socket.on("input", (keys) => {
    socket.keys = keys;
  });

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
    io.emit("remove", socket.id);
  });
});

/* ---------------- GAME LOOP ---------------- */
function tick() {
  const sockets = [...io.sockets.sockets.values()];

  for (let socket of sockets) {
    const p = players[socket.id];
    if (!p || !socket.keys) continue;

    const k = socket.keys;

    if (k.w) p.y -= 4;
    if (k.s) p.y += 4;
    if (k.a) p.x -= 4;
    if (k.d) p.x += 4;
  }

  io.emit("state", players);
}

/* 60ms = smooth + stable */
setInterval(tick, 60);

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
