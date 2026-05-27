# AI AGENTS

## Objetivo

Criar bots que pareçam jogar uma partida Mata-Mata ativa: exploram o mapa, procuram contato, brigam entre si, usam cobertura simples e respawnam para novas rotas.

Não usar API externa de IA.

A inteligência deve ser local, baseada em:

- Heurísticas
- Utility AI
- Máquina de estados
- Memória comportamental
- Papéis táticos
- Percepção simplificada

## Arquitetura do agente

Cada bot deve ter:

```ts
type AgentState = {
  id: string;
  role: AgentRole;
  currentGoal: AgentGoal;
  memory: AgentMemory;
  perception: AgentPerception;
  utilityWeights: AgentUtilityWeights;
};
```

## Papéis

### Entry

Avança primeiro, busca contato e abre espaço.

### Support

Segue entry, troca kills e cobre avanço.

### Lurker

Ataca por rotas alternativas.

### Sniper

Segura ângulos longos.

### Anchor

Protege rota de rotação e fecha espaço quando o time perde controle do mapa.

## Estados

- `Idle`
- `Patrol`
- `Investigate`
- `Search`
- `Engage`
- `StrafeCombat`
- `PushEnemy`
- `Chase`
- `TakeCover`
- `Retreat`
- `Reload`
- `HoldAngle`

## Percepção

Bots devem perceber:

- Inimigos no campo de visão
- Sons de tiro
- Sons de passos simplificados
- Última posição conhecida de inimigos
- Morte de aliados
- Aliado sob ataque
- Eventos de tiro compartilhados pelo time
- Inimigo visto por aliado

## Memória curta

Durante a vida atual:

- Última posição vista do jogador
- Último som ouvido
- Aliados próximos
- Inimigos próximos
- Caminho atual
- Objetivo atual

## Memória da partida

Durante a partida:

- Rotas mais usadas pelo jogador
- Frequência de rush
- Frequência de camper
- Agressividade
- Precisão média
- Tempo médio até primeiro contato

## Perfil do jogador

Exemplo:

```ts
type PlayerProfile = {
  preferredRoutes: Record<RouteId, number>;
  aggressionScore: number;
  averageContactTime: number;
  campingScore: number;
  clutchBehavior: number;
};
```

## Adaptação

Exemplos:

### Jogador rusha pela mesma rota frequentemente

- Bots aumentam presença nessa rota
- Sniper segura ângulo
- Support tenta trocar kill
- Lurker flanqueia por outra rota

### Jogador joga passivo

- TRs avançam mais rápido
- CTs buscam informação
- Bots tomam mais espaço

### Jogador é muito agressivo

- Bots seguram ângulos
- Bots fazem bait
- Bots recuam para posições de vantagem

## Utility AI

Cada ação recebe uma pontuação.

Exemplo:

```ts
scoreAttack = enemyVisible * aggressionWeight + allyNearby * supportWeight;
scoreRetreat = lowHealth * survivalWeight + outnumbered * dangerWeight;
scoreRotate = mapPressure * objectiveWeight + teammateCall * teamWeight;
```

O bot escolhe a ação de maior score, respeitando cooldowns e estado da partida.

## Implementação atual

O sistema atual usa rotas por papel e por time no mapa Forest:

- Entry cruza Town Square e Main Street.
- Support disputa Market e Sawmill.
- Lurker flanqueia por North Forest e South Forest.
- Sniper segura Bridge, Church Yard e Apartments.
- Anchor alterna camp, alley e rota lateral.

O agente também usa:

- separação entre aliados para reduzir bloqueios
- slide em colisão para reduzir bot preso em parede
- `shot_fired` para percepção sonora
- `enemy_spotted` para comunicação visual entre aliados
- respawn individual em área segura do mapa
- memória curta para perseguir inimigo visto/ouvido

## Debug

O client possui overlay com `F3` mostrando:

- Estado atual do bot
- Objetivo atual
- Confiança de combate
- Visibilidade atual
- Eventos recentes
