import type { PlayerState, TeamId, Vector3 } from "@ai-browser-fps/shared";
import { MAP_COLLIDERS, MAP_DEATHMATCH_SPAWNS, MAP_SPAWNS } from "@ai-browser-fps/shared";

const playerRadius = 0.42;

export function getSpawn(team: TeamId, index: number): Vector3 {
  const spawns = MAP_SPAWNS[team];
  return { ...spawns[index % spawns.length] };
}

export function getDeathmatchSpawn(players: PlayerState[], respawningPlayer: PlayerState): Vector3 {
  const candidates = MAP_DEATHMATCH_SPAWNS.filter((spawn) => !intersectsCollider(spawn.x, spawn.z));
  const fallback = getSpawn(respawningPlayer.team, 0);
  const scored = candidates
    .map((spawn) => ({
      spawn,
      score: scoreSpawn(spawn, players, respawningPlayer)
    }))
    .sort((a, b) => b.score - a.score);
  const pool = scored.slice(0, Math.min(5, scored.length));
  const selected = pool[Math.floor(Math.random() * pool.length)]?.spawn ?? fallback;

  return jitterSpawn(selected);
}

function scoreSpawn(spawn: Vector3, players: PlayerState[], respawningPlayer: PlayerState): number {
  let nearestEnemy = 40;
  let nearestAlly = 40;
  let spawnCampPenalty = 0;

  for (const player of players) {
    if (player.id === respawningPlayer.id || !player.alive) {
      continue;
    }

    const gap = distance(spawn, player.position);
    if (gap < 2.2) {
      spawnCampPenalty += 30;
    }
    if (player.team === respawningPlayer.team) {
      nearestAlly = Math.min(nearestAlly, gap);
    } else {
      nearestEnemy = Math.min(nearestEnemy, gap);
    }
  }

  const enemySafety = nearestEnemy < 7 ? nearestEnemy * 2 - 30 : Math.min(nearestEnemy, 22);
  const allySpacing = nearestAlly < 4 ? nearestAlly - 8 : Math.min(nearestAlly, 12) * 0.35;
  return enemySafety + allySpacing + Math.random() * 4 - spawnCampPenalty;
}

function jitterSpawn(spawn: Vector3): Vector3 {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 1.2;
    const candidate = {
      x: spawn.x + Math.sin(angle) * radius,
      y: 0,
      z: spawn.z + Math.cos(angle) * radius
    };

    if (!intersectsCollider(candidate.x, candidate.z)) {
      return candidate;
    }
  }

  return { ...spawn };
}

function intersectsCollider(x: number, z: number): boolean {
  return MAP_COLLIDERS.some(
    (collider) => x + playerRadius > collider.minX && x - playerRadius < collider.maxX && z + playerRadius > collider.minZ && z - playerRadius < collider.maxZ
  );
}

function distance(a: Vector3, b: Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
