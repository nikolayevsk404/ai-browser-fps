import type { TeamId, Vector3, WeaponId } from "./game.js";

export type AgentRole = "entry" | "support" | "lurker" | "sniper" | "anchor";

export type BotBrainState =
  | "Idle"
  | "Patrol"
  | "Investigate"
  | "Search"
  | "Engage"
  | "TakeCover"
  | "Retreat"
  | "Reload"
  | "PushEnemy"
  | "HoldAngle"
  | "Chase"
  | "StrafeCombat";

export type CombatEventType = "ally_under_fire" | "enemy_spotted" | "ally_died" | "shots_heard" | "shot_fired";

export type CombatEvent = {
  id: string;
  at: number;
  type: CombatEventType;
  team: TeamId;
  position: Vector3;
  sourceId: string | null;
  targetId: string | null;
};

export type AgentPerception = {
  visibleEnemyIds: string[];
  heardShotAt: Vector3 | null;
  lastKnownEnemyPosition: Vector3 | null;
  lastKnownEnemyId: string | null;
  alliesNearby: number;
  enemiesNearby: number;
  allyUnderFire: boolean;
  allyDied: boolean;
  visibilityScore: number;
};

export type AgentMemory = {
  lastSeenEnemyAt: number | null;
  lastHeardSoundAt: number | null;
  currentPath: string[];
  patrolIndex: number;
  lastKnownPlayerPosition: Vector3 | null;
};

export type AgentBrain = {
  state: BotBrainState;
  stateEnteredAt: number;
  targetEnemyId: string | null;
  targetNavPointId: string;
  coverNavPointId: string | null;
  aimYaw: number;
  combatConfidence: number;
  reactionReadyAt: number;
  nextBurstAt: number;
  burstShotsLeft: number;
  reloadUntil: number | null;
  stuckSince: number | null;
  strafeDir: -1 | 1;
  scanYaw: number;
  hesitateUntil: number | null;
};

export type AgentState = {
  id: string;
  playerId: string;
  team: TeamId;
  role: AgentRole;
  brain: AgentBrain;
  perception: AgentPerception;
  memory: AgentMemory;
};

export type AgentCommunication = {
  id: string;
  at: number;
  fromAgentId: string;
  team: TeamId;
  message: string;
};

export type BotCombatResult = {
  attackerId: string;
  victimId: string;
  weapon: WeaponId;
  damage: number;
  hit: boolean;
};
