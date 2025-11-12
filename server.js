// server.js (HTTPS version)
const fs = require("fs");
const express = require("express");
const { WebSocketServer } = require("ws");
const https = require("https");

const app = express();
app.use(express.static(".")); // serve everything

// Load local certificates
const server = https.createServer({
  key: fs.readFileSync("certs/key.pem"),
  cert: fs.readFileSync("certs/cert.pem")
}, app);

const wss = new WebSocketServer({ server });

let controllerSocket = null;
let gameSocket = null;

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    if (data.type === "register") {
      if (data.role === "controller") controllerSocket = ws;
      if (data.role === "game") gameSocket = ws;
      console.log("Registered:", data.role);
    }

    if (data.type === "sensorData" && gameSocket && ws === controllerSocket) {
      gameSocket.send(JSON.stringify({ type: "sensorData", payload: data.payload }));
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});

const PORT = 3000;
server.listen(PORT, () => console.log(`🔒 HTTPS server running at https://localhost:${PORT}`));
