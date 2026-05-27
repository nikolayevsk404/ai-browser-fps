import http from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import type { ClientMessage, ServerMessage } from "@ai-browser-fps/shared";
import { PROTOCOL_VERSION } from "@ai-browser-fps/shared";
import { GameEngine } from "./game/GameEngine.js";
import { clientDistAvailable, tryServeClient } from "./serveClient.js";

const port = Number(process.env.PORT ?? 3000);
const isProduction = process.env.NODE_ENV === "production";
const game = new GameEngine();

const server = http.createServer((request, response) => {
  if (request.url === "/health" || request.url?.startsWith("/health?")) {
    const payload = {
      ok: true,
      protocolVersion: PROTOCOL_VERSION,
      tick: game.getState().tick,
      uptime: process.uptime()
    };

    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
    return;
  }

  if (isProduction && tryServeClient(request, response)) {
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ ok: false, error: "not_found" }));
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  const clientId = randomUUID();

  const accepted: ServerMessage = {
    type: "connection/accepted",
    payload: {
      clientId,
      protocolVersion: PROTOCOL_VERSION,
      message: "Team Deathmatch server online"
    }
  };

  socket.send(JSON.stringify(accepted));
  send(socket, { type: "game/state", payload: game.getState() });

  socket.on("message", (rawMessage) => {
    const message = parseClientMessage(rawMessage.toString());

    if (!message) {
      return;
    }

    if (message.type === "health/ping") {
      const pong: ServerMessage = {
        type: "health/pong",
        payload: {
          sentAt: message.payload.sentAt,
          serverTime: Date.now()
        }
      };

      socket.send(JSON.stringify(pong));
    }

    if (message.type === "player/select-team") {
      game.selectTeam(message.payload.team);
      send(socket, { type: "server/notice", payload: { message: `Time selecionado: ${message.payload.team}` } });
      send(socket, { type: "game/state", payload: game.getState() });
    }

    if (message.type === "player/equip") {
      const equipped = game.equipWeapon(message.payload.weapon);
      send(socket, {
        type: "server/notice",
        payload: { message: equipped ? `Equipado: ${message.payload.weapon}` : "Arma indisponível" }
      });
      send(socket, { type: "game/state", payload: game.getState() });
    }

    if (message.type === "player/shoot") {
      game.shoot(message.payload.origin, message.payload.direction, message.payload.weapon);
      send(socket, { type: "game/state", payload: game.getState() });
    }

    if (message.type === "match/restart") {
      game.restartMatch();
      send(socket, { type: "game/state", payload: game.getState() });
    }

    if (message.type === "player/position") {
      game.updatePlayerPosition(message.payload.position);
    }
  });
});

server.listen(port, async () => {
  console.log(`Server listening on http://localhost:${port}`);

  if (isProduction && (await clientDistAvailable())) {
    console.log(`Client build available at http://localhost:${port}/`);
  }
});

setInterval(() => {
  const state = game.tick();
  const message: ServerMessage = { type: "game/state", payload: state };

  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      send(client, message);
    }
  }
}, game.getTickRateMs());

function parseClientMessage(rawMessage: string): ClientMessage | null {
  try {
    return JSON.parse(rawMessage) as ClientMessage;
  } catch {
    return null;
  }
}

function send(socket: { send: (data: string) => void }, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}
