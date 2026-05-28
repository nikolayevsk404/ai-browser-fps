import type { GameState, MatchPhase, PlayerState, TeamId } from "@ai-browser-fps/shared";
import { TDM_MATCH_DURATION_MS, TDM_MAX_ROUNDS, TDM_ROUND_DURATION_MS, TDM_SCORE_LIMIT } from "@ai-browser-fps/shared";
import { AgentSystem } from "../agents/AgentSystem.js";
import { createInitialPlayerProfile } from "../agents/PlayerProfileSystem.js";
import { getSpawn } from "./spawns.js";

const teamNames: Record<TeamId, string> = {
  CT: "Counter-Terrorists",
  TR: "Terrorists"
};

export function createInitialState(now = Date.now(), selectedTeam: TeamId = "CT", phase: MatchPhase = "running"): GameState {
  const players = createPlayers(selectedTeam, now);
  const agentSystem = new AgentSystem();

  return {
    tick: 0,
    serverTime: now,
    match: {
      scoreLimit: TDM_SCORE_LIMIT,
      maxRounds: TDM_MAX_ROUNDS,
      matchDurationMs: TDM_MATCH_DURATION_MS,
      startedAt: now,
      endsAt: now + TDM_MATCH_DURATION_MS,
      roundNumber: 1,
      roundPhase: "live",
      roundStartedAt: now,
      roundEndsAt: now + TDM_ROUND_DURATION_MS,
      roundWinner: null,
      teams: {
        CT: { id: "CT", name: teamNames.CT, score: 0 },
        TR: { id: "TR", name: teamNames.TR, score: 0 }
      },
      selectedTeam,
      phase,
      winner: null
    },
    playerProfile: createInitialPlayerProfile(),
    players,
    agents: agentSystem.createAgents(players),
    agentComms: [],
    combatEvents: [],
    events: []
  };
}

function createPlayers(selectedTeam: TeamId, now: number): PlayerState[] {
  const teams: TeamId[] = ["CT", "TR"];

  return teams.flatMap((team) => {
    const players: PlayerState[] = [];
    const hasHuman = team === selectedTeam;

    if (hasHuman) {
      players.push(createPlayer("player", `Player ${team}`, team, "human", 0, now));
    }

    const botCount = hasHuman ? 4 : 5;

    for (let index = 0; index < botCount; index += 1) {
      const spawnIndex = hasHuman ? index + 1 : index;
      players.push(createPlayer(`${team.toLowerCase()}-bot-${index + 1}`, `${team} Bot ${index + 1}`, team, "bot", spawnIndex, now));
    }

    return players;
  });
}

function createPlayer(
  id: string,
  name: string,
  team: TeamId,
  kind: PlayerState["kind"],
  spawnIndex: number,
  now: number
): PlayerState {
  const primary = "rifle";
  const secondary = "pistol";

  return {
    id,
    name,
    team,
    kind,
    health: 100,
    alive: true,
    position: getSpawn(team, spawnIndex),
    velocity: { x: 0, y: 0, z: 0 },
    yaw: team === "CT" ? 0 : Math.PI,
    weapon: primary,
    loadout: {
      primary,
      secondary,
      melee: "knife",
      equipped: primary
    },
    stats: {
      kills: 0,
      deaths: 0,
      ping: kind === "human" ? 24 : 0
    },
    animation: "idle",
    lastActionAt: now,
    respawnAt: null
  };
}
