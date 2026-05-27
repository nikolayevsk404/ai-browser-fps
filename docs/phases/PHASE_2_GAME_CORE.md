# Fase 2 - Game Core

## Entregue

- `GameState`, `MatchState`, `PlayerState`, `TeamState` e tipos compartilhados em `shared`.
- Game loop server-side.
- Composição 5 CT vs 5 TR.
- Vida, dano, morte e kill feed.
- Placar por kill.
- Respawn individual.
- Fim de partida por score limit ou tempo.
- Broadcast WebSocket `game/state`.

## Decisão Atual

O core é Mata-Mata. Round competitivo, bomba, economia e compra ficam fora até a gameplay de bots estar sólida.
