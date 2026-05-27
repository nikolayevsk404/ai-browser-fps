# Portfolio Notes

## Resumo

FPS Mata-Mata em navegador, construído com React, TypeScript, Three.js, Node.js e WebSocket. O servidor é autoritativo para dano, placar, respawn e comportamento dos bots.

## Destaques

- Modo 5v5 com jogador substituindo um bot no time escolhido.
- Partida de 10 minutos ou até 100 kills.
- Respawn individual em pontos variados e seguros.
- Mapa Abandoned City low poly, noturno e tomado pela floresta.
- Bots com papéis táticos, percepção, memória curta e comunicação.
- Debug de IA no client.
- Arquitetura monorepo com `client`, `server` e `shared`.

## Foco Técnico

- Simulação server-side.
- Sincronização por WebSocket.
- Tipos compartilhados.
- Renderização Three.js.
- IA local sem APIs externas.
- Iteração de gameplay com testes.
