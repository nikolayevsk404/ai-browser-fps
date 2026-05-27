# AI Counter-Strike 1.6 Browser Clone

FPS competitivo inspirado em CS 1.6, rodando no navegador, com visual Low Poly/PS1 e bots controlados por AI Agents adaptativos.

## Status

As 10 fases do roadmap inicial foram implementadas.

## Visão Geral

O projeto é um experimento técnico de game development web, arquitetura multiplayer-like e agentes inteligentes.

A proposta atual é construir um Mata-Mata por equipes no navegador:

- 5 CT vs 5 TR
- 10 minutos de partida
- primeiro time a chegar em 100 kills vence
- Jogador escolhe o time
- Se o jogador escolhe CT: 1 jogador + 4 bots CT contra 5 bots TR
- Se o jogador escolhe TR: 1 jogador + 4 bots TR contra 5 bots CT
- Mapa Abandoned City: cidade destruída low poly tomada pela floresta
- Respawn individual após morte, em áreas variadas do mapa
- Bots com comportamento tático por papéis e rotas
- AI Agents que aprendem padrões do jogador

## Stack

- React
- Vite
- TypeScript
- Three.js
- Node.js
- WebSocket
- Docker
- Arquitetura client/server
- IA local baseada em heurísticas, utilidade e memória comportamental

## Filosofia

Este projeto deve ser desenvolvido em etapas.

A prioridade inicial não é ter interface bonita, mas sim:

1. Arquitetura sólida
2. Game loop confiável
3. Estado de partida consistente
4. FPS jogável
5. Bots funcionais
6. Agentes adaptativos
7. Interface e polimento

## Estrutura do projeto

```txt
.
├── client/   # React + Vite + Three.js
├── server/   # Node.js + HTTP/WebSocket + simulação autoritativa
├── shared/   # Tipos, constantes e protocolo compartilhado
├── docs/     # Documentação AI-first organizada por domínio
├── assets/   # Reserva para assets fonte, incluindo modelos 3D futuros
└── README.md
```

## Documentação

A documentação principal fica em [`docs/`](docs/README.md):

- [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) — arquitetura, ownership e loop autoritativo.
- [`docs/design/GAME_DESIGN.md`](docs/design/GAME_DESIGN.md) — regras, mapa, HUD e experiência.
- [`docs/ai/AI_AGENTS.md`](docs/ai/AI_AGENTS.md) — comportamento dos bots e agentes adaptativos.
- [`docs/planning/TASKS.md`](docs/planning/TASKS.md) — roadmap atual e itens fora do core.
- [`docs/phases/`](docs/phases/) — histórico de implementação por fase.
- [`docs/operations/DOCKER.md`](docs/operations/DOCKER.md) — execução via Docker.
- [`docs/prompts/CODEX_MASTER_PROMPT.md`](docs/prompts/CODEX_MASTER_PROMPT.md) — prompt mestre histórico para agentes.

Assets 3D futuros devem entrar em [`assets/3d/`](assets/README.md), separados por mapas, personagens CT/TR e armas.

## Escopo inicial

O primeiro objetivo é criar uma base executável com:

- React rodando
- Server Node rodando
- WebSocket funcionando
- Tipos compartilhados
- Estrutura pronta para game loop
- Documentação viva

## Como rodar

### Requisitos

- Node.js 20+
- npm 10+
- Docker Desktop (opcional, para rodar tudo em um container)

### Desenvolvimento (recomendado)

Na raiz do repositório:

```bash
npm install
npm run dev
```

Isso sobe três processos em paralelo:

- `shared` — compila tipos/protocolo em watch
- `server` — API + WebSocket em `http://localhost:3000`
- `client` — Vite em `http://localhost:5173` ou na próxima porta livre

Abra o jogo no navegador:

```txt
http://localhost:5173
```

Se o Vite avisar `Port 5173 is in use`, use a URL impressa no terminal, por exemplo `http://localhost:5175`.

Health check do servidor:

```txt
http://localhost:3000/health
```

Se a porta 3000 já estiver em uso, pare o processo antigo ou defina outra porta:

```bash
PORT=3001 npm run dev -w server
```

O client usa `ws://localhost:3000` por padrão. Para outra porta no servidor:

```bash
VITE_WS_URL=ws://localhost:3001 npm run dev -w client
```

### Produção com Docker

Build e execução:

```bash
docker compose up --build
```

Abra o jogo (client + server no mesmo host):

```txt
http://localhost:9000
```

Health check:

```txt
http://localhost:9000/health
```

O container expõe o build do client e o servidor na porta `9000`. O WebSocket usa o mesmo host automaticamente.

Se aparecer erro `Cannot find module .../shared/src/index.ts`, a imagem Docker provavelmente está com cache antigo. Rebuild sem cache:

```bash
docker compose build --no-cache
docker compose up
```

### Build local (sem Docker)

```bash
npm install
npm run build
NODE_ENV=production PORT=3000 npm run start -w server
```

Com o build do client em `client/dist`, o servidor serve a interface em `http://localhost:3000` quando `NODE_ENV=production`.

## Scripts

```bash
npm run dev        # inicia shared, server e client
npm run typecheck  # valida TypeScript nos workspaces
npm run build      # gera builds dos workspaces
npm run test       # roda testes dos workspaces
```

## WebSocket da Fase 1

- URL: `ws://localhost:3000`
- Client envia: `health/ping`
- Server responde: `health/pong`
- Server também envia `connection/accepted` ao conectar

## Game Core atual

O core atual roda autoritativo no servidor:

- `GameState` compartilhado entre server e client
- 5 CT vs 5 TR, com o jogador ocupando uma vaga do time escolhido
- loop autoritativo no servidor
- vida, dano, morte e kill feed
- score por kill
- respawn individual depois de cada morte
- respawn em pontos seguros e variados do mapa
- proteção curta de spawn após respawn
- fim por limite de 100 kills ou 10 minutos
- broadcast WebSocket `game/state`

Não há bomba, economia ou rounds competitivos no core atual. O foco é deixar o Mata-Mata divertido e os bots realmente ativos.

## FPS Browser atual

A Fase 3 adiciona a camada jogável local no navegador:

- cena Three.js full-screen
- câmera em primeira pessoa
- movimento WASD
- mouse look com Pointer Lock
- colisão simples
- arma placeholder
- raycast shooting local
- bots low poly renderizados a partir do snapshot do servidor
- HUD técnico sobreposto
- efeitos de tiro dos bots com tracer/muzzle flash
- scoreboard e mapa tático
- debug de IA com `L`
- `F5` reinicia a partida atual

O mapa atual é Abandoned City: uma cidade destruída em noite clara, tomada pela floresta, com ruínas, carcaças de veículos, vegetação invadindo ruas e pontos de combate sem nomes visíveis no mundo ou no mapa tático.

## Regras do Mata-Mata

- A partida começa em 5v5.
- Kills somam ponto diretamente no placar do time.
- Jogador e bots respawnam alguns segundos após morrer.
- Respawns usam áreas variadas do mapa, evitando paredes e inimigos muito próximos.
- O jogador nasce inicialmente no lado do time escolhido.
- A partida termina quando um time chega a 100 kills ou quando o timer de 10 minutos acaba.

## IA Atual

Os bots usam uma máquina de estados server-side com:

- papéis: entry, support, lurker, sniper e anchor
- rotas de patrulha diferentes por time e papel
- percepção visual e sonora
- memória de último inimigo visto/ouvido
- comunicação via eventos de combate
- strafe, chase, retreat, take cover e hold angle
- separação entre aliados para reduzir aglomeração
- navegação com slide em colisões para reduzir bots presos em parede

## Mapa atual

O mapa jogável atual é Abandoned City:

- spawns CT/TR
- núcleo urbano destruído
- rotas laterais tomadas pela floresta
- ruínas, armazéns, carros queimados, troncos, barricadas e cobertura baixa
- iluminação noturna legível com luz fria e focos quentes de fogo
- locais sem labels no mundo 3D e no mapa tático
- colisões para navegação FPS
- nav points conectados para bots

O layout prioriza circulação, múltiplas linhas de combate e respawn seguro, não fidelidade ao Dust 2 original.

## Sistema Mata-Mata atual

O modo atual implementa:

- escolha técnica de time CT/TR
- composição 5 CT vs 5 TR
- partida de 10 minutos
- placar por kill
- limite de 100 kills
- respawn individual em pontos variados
- loadout simples com rifle/sniper, pistol e knife, usando a mesma distribuição de armas para CT e TR

O servidor controla time, tiros, dano, placar, respawn, timer e fim da partida.

## AI Agents atual

A Fase 7 transforma bots em agentes com estado interno:

- roles táticos
- objetivos internos
- percepção simplificada
- memória curta
- decisão por utility score
- comunicação básica entre bots
- debug view no HUD

Os bots usam rotas diferentes em Abandoned City para criar contato no núcleo urbano, nas ruínas, na ponte e nas florestas laterais.

## AI Agents adaptativos atual

A Fase 8 adiciona aprendizado local durante a partida:

- rotas frequentes do jogador
- agressividade
- posições frequentes
- tendência passiva/camper
- ajuste de pesos de decisão dos bots
- reforço de rotas conforme movimento do jogador
- alteração de confiança conforme o perfil
- resumo de aprendizado no HUD técnico

O sistema não usa API externa. A adaptação é baseada em heurísticas, memória da partida e utility AI.

## Interface atual

A Fase 9 adiciona o fluxo visual principal:

- menu principal
- seleção de time
- HUD final de partida
- scoreboard
- feedback de morte/respawn
- tela de fim de partida
- configurações de sensibilidade e volume

A interface é funcional e integrada ao FPS. Sons e polimento visual entram na Fase 10.

## Polimento atual

A Fase 10 adiciona:

- sons sintéticos via Web Audio
- partículas low poly
- animações simples
- chunks separados para React/Three.js
- testes server-side focados em IA adaptativa
- Docker final multi-stage
- material de portfólio em `docs/portfolio/PORTFOLIO_NOTES.md`

## Fora do escopo inicial

- Multiplayer online real entre humanos
- Matchmaking
- Skins
- Inventário
- Ranking online
- Assets realistas
- Cópia 1:1 do CS 1.6
- Uso de APIs externas de IA

## Objetivo de portfólio

Este projeto deve demonstrar:

- Desenvolvimento de jogos web
- Three.js
- Arquitetura client/server
- Simulação de partidas
- AI Agents
- Design de sistemas
- Código limpo
- Evolução incremental
