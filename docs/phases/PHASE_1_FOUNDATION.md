# Fase 1 - Fundação técnica

## Escopo implementado

- Monorepo com workspaces `client`, `server` e `shared`.
- Client React + Vite + TypeScript.
- Server Node + TypeScript com HTTP `/health` e WebSocket.
- Contratos compartilhados em `shared/src/protocol`.
- Evento WebSocket `health/ping` -> `health/pong`.
- Tela técnica mínima mostrando status da conexão.

## Decisões

- O servidor já nasce como autoridade da sessão, mesmo sem gameplay.
- O client apenas exibe estado de conexão e envia health check.
- O pacote `shared` concentra o protocolo para evitar contratos duplicados entre client e server.
- Gameplay, Three.js, bots, round loop e bomba ficam fora desta fase.

## Portas

- Client Vite: `5173`
- Server HTTP/WebSocket: `3000`
