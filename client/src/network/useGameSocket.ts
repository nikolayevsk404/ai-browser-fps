import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClientMessage, GameState, ServerMessage, TeamId, Vector3, WeaponId } from "@ai-browser-fps/shared";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

function resolveWsUrl(): string {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) {
    return configured;
  }

  if (import.meta.env.DEV) {
    return "ws://localhost:3000";
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }

  return "ws://localhost:3000";
}

const wsUrl = resolveWsUrl();

export function useGameSocket() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [clientId, setClientId] = useState<string | null>(null);
  const [lastPongAt, setLastPongAt] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string>("Aguardando servidor");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const statusLabel = useMemo(() => {
    const labels: Record<ConnectionStatus, string> = {
      connecting: "Conectando",
      connected: "Conectado",
      disconnected: "Desconectado",
      error: "Erro"
    };

    return labels[status];
  }, [status]);

  useEffect(() => {
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setStatus("connected");
      const message: ClientMessage = { type: "health/ping", payload: { sentAt: Date.now() } };
      socket.send(JSON.stringify(message));
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data as string) as ServerMessage;

      if (message.type === "connection/accepted") {
        setClientId(message.payload.clientId);
        setServerMessage(message.payload.message);
      }

      if (message.type === "health/pong") {
        setLastPongAt(new Date(message.payload.serverTime).toLocaleTimeString());
      }

      if (message.type === "game/state") {
        setGameState(message.payload);
      }

      if (message.type === "server/notice") {
        setServerMessage(message.payload.message);
      }
    });

    socket.addEventListener("close", () => {
      setStatus("disconnected");
    });

    socket.addEventListener("error", () => {
      setStatus("error");
    });

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, []);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(message));
  }, []);

  const selectTeam = useCallback(
    (team: TeamId) => {
      send({ type: "player/select-team", payload: { team } });
    },
    [send]
  );

  const equipWeapon = useCallback(
    (weapon: WeaponId) => {
      send({ type: "player/equip", payload: { weapon } });
    },
    [send]
  );

  const shoot = useCallback(
    (origin: Vector3, direction: Vector3, weapon: WeaponId) => {
      send({ type: "player/shoot", payload: { origin, direction, weapon } });
    },
    [send]
  );

  const sendPlayerPosition = useCallback(
    (position: Vector3) => {
      send({ type: "player/position", payload: { position } });
    },
    [send]
  );

  const restartMatch = useCallback(() => {
    send({ type: "match/restart" });
  }, [send]);

  return {
    clientId,
    equipWeapon,
    gameState,
    lastPongAt,
    restartMatch,
    selectTeam,
    sendPlayerPosition,
    shoot,
    serverMessage,
    status,
    statusLabel
  };
}
