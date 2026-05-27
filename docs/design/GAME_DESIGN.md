# GAME DESIGN

## Pitch

FPS web low poly em modo Mata-Mata por equipes, inspirado na sensação de CS, mas focado em bots inteligentes e partidas rápidas. O mapa atual é uma cidade abandonada, destruída e tomada pela floresta.

## Loop Principal

1. Jogador escolhe CT ou TR.
2. O time escolhido recebe o jogador mais 4 bots.
3. O time inimigo recebe 5 bots.
4. A partida dura 10 minutos.
5. Kills somam ponto imediatamente para o time do atacante.
6. Quem morre respawna alguns segundos depois em uma área segura e variada do mapa.
7. O primeiro time a chegar em 100 kills vence.
8. Se o tempo acabar antes, vence quem tiver mais kills.

## Times

- CT
- TR

Sempre 5v5:

- Jogador CT: 1 jogador + 4 bots CT contra 5 bots TR.
- Jogador TR: 1 jogador + 4 bots TR contra 5 bots CT.

## Mapa

Abandoned City:

- spawns CT/TR
- núcleo urbano destruído
- rotas de floresta invadindo a cidade
- ponte e ruínas como linhas médias de combate
- cabanas/armazéns deteriorados
- carros queimados, troncos, barricadas e cobertura baixa
- noite legível, sem labels de locais no mundo ou no mapa tático

O mapa deve favorecer:

- rotas de flanco
- linhas de visão médias
- cobertura baixa
- respawns espalhados
- contato frequente entre bots

## Armas

Loadout simples:

- Primária: rifle ou sniper
- Secundária: pistol
- Terciária: knife

Armas têm dano, alcance, fire rate e spread simplificados.

## HUD

- Placar CT/TR
- Tempo restante
- Kills para o limite
- HP
- K/D
- arma equipada
- respawn countdown
- scoreboard
- mapa tático
- debug de IA com `L`
- `F5` reinicia a partida atual

## IA

Os bots precisam gerar gameplay ativa:

- Entry disputa praça e rua principal.
- Support cobre mercado/serraria.
- Lurker flanqueia pelas florestas.
- Sniper segura ponte, igreja e linhas longas.
- Anchor fecha rotação e avança quando o time perde espaço.

Bots devem:

- explorar rotas diferentes
- reagir a tiros
- comunicar inimigo visto
- perseguir inimigo ferido
- trocar tiros contra outros bots
- evitar nascer colado em inimigo
- evitar travar em paredes

## Fora do Core Atual

- bomba
- economia
- compra
- rounds competitivos
- multiplayer humano real

Esses sistemas só voltam quando o Mata-Mata e os bots estiverem sólidos.
