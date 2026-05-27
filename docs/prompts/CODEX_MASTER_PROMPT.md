# CODEX MASTER PROMPT — AI Counter-Strike 1.6 Browser Clone

Você é um agente de desenvolvimento sênior atuando dentro deste repositório.

## Objetivo do Projeto

Construir, em etapas pequenas e bem-feitas, um FPS competitivo inspirado em CS 1.6 que rode no navegador, usando:

- React
- Node.js
- TypeScript
- Three.js
- WebSockets
- Arquitetura modular
- Bots como AI Agents
- Visual Low Poly / PS1
- Apenas um mapa inspirado em Dust 2, baseado no arquivo `mapa.png` presente na raiz do projeto

O jogo deve simular uma partida competitiva:

- 5 CT vs 5 TR
- Jogador escolhe o time
- Bots completam os times
- 12 rounds
- Sistema de compra simplificado
- Sistema de bomba
- Plant/defuse
- Mensagem “The bomb has been planted”
- Vitória por eliminação, explosão ou defuse
- Bots com comportamento tático progressivo
- AI Agents capazes de aprender padrões do jogador ao longo da partida

## Regra Principal

NÃO tente construir tudo de uma vez.

Trabalhe em fases. Cada fase deve deixar o projeto executável, testável e documentado.

Antes de implementar qualquer etapa, leia todos os `.md` da raiz do projeto e respeite as decisões arquiteturais já documentadas.

## Ordem Obrigatória de Desenvolvimento

### Fase 1 — Fundação técnica

Priorize:

- Estrutura de pastas
- Setup React + Vite + TypeScript
- Setup Node + TypeScript
- Setup WebSocket
- Separação entre client, server, shared e docs
- Docker opcional, mas preparado
- Scripts de dev
- Tipos compartilhados

Não implementar interface complexa ainda.

### Fase 2 — Game Core

Criar a base da simulação:

- Game loop
- Estado da partida
- Times
- Jogador
- Bots placeholder
- Rounds
- Spawn
- Vida
- Dano
- Vitória por eliminação
- Reinício de round

O jogo ainda pode usar geometria simples.

### Fase 3 — FPS no navegador

Implementar:

- Cena Three.js
- Câmera em primeira pessoa
- Controles WASD + mouse look
- Raycast shooting
- Colisões básicas
- Armas simplificadas
- HUD mínimo técnico

### Fase 4 — Mapa Dust 2 Low Poly

Usar `mapa.png` como referência visual/espacial.

Criar uma versão Low Poly/PS1 inspirada no layout:

- CT Spawn
- TR Spawn
- Bombsite A
- Bombsite B
- Mid
- Long
- Tunnels
- Catwalk/Short
- Caixas e paredes simples

Não buscar fidelidade perfeita. Priorizar jogabilidade e navegação.

### Fase 5 — Sistema competitivo

Implementar:

- 5 CT vs 5 TR
- Escolha de time
- 12 rounds
- Scoreboard
- Economia simplificada
- Compra básica
- Tempo de round
- Condições de vitória
- Freeze time simplificado

### Fase 6 — Sistema da bomba

Implementar:

- Bomba começa com um TR
- Plant em bombsites
- Timer da bomba
- Mensagem “The bomb has been planted”
- Defuse por CT
- Vitória TR por explosão
- Vitória CT por defuse
- Vitória CT por tempo caso bomba não seja plantada

### Fase 7 — AI Agents v1

Bots devem ser agentes com estado interno, não apenas scripts burros.

Implementar:

- Estados: idle, patrol, attack, rotate, plant, defuse, cover, retreat
- Percepção: visão, som simplificado, última posição conhecida
- Decisão baseada em utilidade
- Papéis: entry, support, lurker, sniper, defender
- Comunicação básica entre bots pelo servidor

### Fase 8 — AI Agents adaptativos

Bots devem observar padrões do jogador:

- Rotas frequentes
- Bombsite preferido
- Agressividade
- Tempo médio para contato
- Uso de posições
- Tendência a rushar, camperar ou rotacionar

A adaptação deve alterar pesos de decisão dos bots.

Exemplo:

- Se jogador sempre rusha Long, CTs reforçam Long.
- Se jogador sempre planta B, CTs rotacionam mais cedo para B.
- Se jogador joga passivo, TRs avançam com mais confiança.

### Fase 9 — Interface

Só depois da base do jogo estar sólida:

- Menu principal
- Escolha de time
- Tela de compra
- HUD final
- Scoreboard
- Feedback visual
- Tela de fim de partida
- Ajustes de sensibilidade/volume

### Fase 10 — Polimento

- Sons
- Animações simples
- Partículas low poly
- Otimização
- Testes
- Refatoração
- README final
- Prints/GIFs para portfólio
- Texto para LinkedIn

## Restrições Técnicas

- Não usar assets pagos.
- Não depender de API externa para IA.
- Não implementar multiplayer real entre humanos agora.
- O servidor Node deve ser autoridade do estado da partida.
- O client apenas renderiza e envia inputs.
- Código deve ser modular e testável.
- Evitar arquivos gigantes.
- Criar tipos compartilhados em `shared`.
- Documentar decisões relevantes.

## Ao trabalhar em uma tarefa

Para cada etapa:

1. Leia os `.md` relevantes.
2. Explique rapidamente o que será alterado.
3. Implemente apenas o escopo da etapa.
4. Atualize `docs/planning/TASKS.md`.
5. Garanta que o projeto rode.
6. Não avance para a próxima fase sem terminar a atual.

## Primeira tarefa agora

Comece pela Fase 1.

Crie a estrutura inicial do projeto com:

- `client/`
- `server/`
- `shared/`
- `docs/`
- configuração TypeScript
- scripts de desenvolvimento
- WebSocket mínimo funcionando
- uma tela React simples indicando conexão com o servidor
- um endpoint ou evento WebSocket de health check
- README atualizado com instruções para rodar

Não implemente gameplay ainda.
