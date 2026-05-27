# ARCHITECTURE

## Princípio central

O servidor é a autoridade do jogo.

O client não decide resultado de dano, morte, respawn, placar, vitória ou comportamento de bots. O client envia inputs e renderiza o estado recebido.

## Estrutura

```txt
client/
  src/
    app/
    game/
    three/
    ui/
    network/

server/
  src/
    game/
    match/
    entities/
    agents/
    systems/
    network/

shared/
  src/
    types/
    constants/
    protocol/

docs/
```

## Client

Responsabilidades:

- Renderizar Three.js
- Capturar input do jogador
- Enviar comandos para o servidor
- Exibir HUD
- Exibir menus
- Interpolar estado recebido do servidor

Não deve:

- Decidir dano final
- Decidir vitória
- Controlar bots
- Alterar placar sozinho
- Confirmar respawn sozinho

## Server

Responsabilidades:

- Game loop
- Estado da partida
- Simulação dos bots
- Regras de Mata-Mata
- Sistema de respawn
- Validação de tiros
- Sincronização com client
- AI Agents

## Shared

Responsável por tipos e contratos:

- `GameState`
- `PlayerState`
- `BotState`
- `Team`
- `Weapon`
- `ClientMessage`
- `ServerMessage`

## Comunicação

Exemplo de mensagens client -> server:

```ts
type ClientMessage =
  | { type: "player/input"; payload: PlayerInput }
  | { type: "player/shoot"; payload: ShootInput }
  | { type: "player/equip"; payload: EquipInput };
```

Exemplo de mensagens server -> client:

```ts
type ServerMessage =
  | { type: "connection/accepted"; payload: ConnectionPayload }
  | { type: "game/state"; payload: GameState };
```

## Game Loop

O game loop principal deve rodar no servidor.

Responsabilidades por tick:

1. Processar inputs
2. Atualizar jogadores
3. Atualizar bots
4. Resolver tiros/dano
5. Processar respawns
6. Verificar limite de score/tempo
7. Enviar snapshot para o client

## Sistemas

Separar lógica em sistemas:

- `MovementSystem`
- `CombatSystem`
- `RespawnSystem`
- `ScoreSystem`
- `AgentSystem`
- `NavigationSystem`
- `PerceptionSystem`

## Filosofia de código

- Arquivos pequenos
- Tipos explícitos
- Baixo acoplamento
- Sistemas testáveis
- Regras de jogo isoladas
- Render separado de simulação
- AI separada de input humano
