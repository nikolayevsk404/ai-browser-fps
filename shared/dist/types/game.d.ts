import type { AgentCommunication, AgentState, CombatEvent } from "./agent.js";
export type TeamId = "CT" | "TR";
export type EntityKind = "human" | "bot";
export type MatchPhase = "lobby" | "running" | "ended";
export type RoundPhase = "live" | "resetting";
export type RouteId = "town_square" | "market" | "sawmill" | "church" | "bridge" | "north_forest" | "south_forest" | "camp";
export type WeaponId = "knife" | "pistol" | "rifle" | "sniper";
export type Vector3 = {
    x: number;
    y: number;
    z: number;
};
export type PlayerAnimation = "idle" | "walk" | "run" | "strafe_left" | "strafe_right" | "crouch_idle" | "crouch_walk" | "jump" | "land" | "shoot" | "reload" | "knife" | "hit" | "death";
export type PlayerState = {
    id: string;
    name: string;
    team: TeamId;
    kind: EntityKind;
    health: number;
    alive: boolean;
    position: Vector3;
    velocity: Vector3;
    yaw: number;
    weapon: WeaponId;
    loadout: {
        primary: WeaponId | null;
        secondary: WeaponId;
        melee: "knife";
        equipped: WeaponId;
    };
    stats: {
        kills: number;
        deaths: number;
        ping: number;
    };
    animation: PlayerAnimation;
    lastActionAt: number;
    respawnAt: number | null;
};
export type TeamState = {
    id: TeamId;
    name: string;
    score: number;
};
export type MatchState = {
    scoreLimit: number;
    maxRounds: number;
    matchDurationMs: number;
    startedAt: number;
    endsAt: number;
    roundNumber: number;
    roundPhase: RoundPhase;
    roundStartedAt: number;
    roundEndsAt: number;
    roundWinner: TeamId | "draw" | null;
    teams: Record<TeamId, TeamState>;
    selectedTeam: TeamId;
    phase: MatchPhase;
    winner: TeamId | "draw" | null;
};
export type PlayerProfile = {
    preferredRoutes: Record<RouteId, number>;
    aggressionScore: number;
    averageContactTime: number;
    campingScore: number;
    positionHeat: Record<RouteId, number>;
    matchesObserved: number;
    summary: string;
};
export type KillEvent = {
    id: string;
    at: number;
    attackerId: string;
    victimId: string;
    weapon: WeaponId;
};
export type GameState = {
    tick: number;
    serverTime: number;
    match: MatchState;
    playerProfile: PlayerProfile;
    players: PlayerState[];
    agents: AgentState[];
    agentComms: AgentCommunication[];
    combatEvents: CombatEvent[];
    events: KillEvent[];
};
//# sourceMappingURL=game.d.ts.map