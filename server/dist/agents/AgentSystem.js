import { MAP_COLLIDERS, MAP_NAV_POINTS, WEAPON_DAMAGE, WEAPON_FIRE_RATE_MS, WEAPON_RANGE, WEAPON_SPREAD } from "@ai-browser-fps/shared";
const roleCycle = ["entry", "support", "lurker", "sniper", "anchor"];
const roleIndex = Object.fromEntries(roleCycle.map((role, index) => [role, index]));
const visionRange = 30;
const hearingRange = 40;
const nearbyRange = 8;
const moveStep = 0.32;
const botRadius = 0.34;
const stuckThresholdMs = 1400;
const roleNavTargets = {
    entry: { CT: "town-square", TR: "town-square" },
    support: { CT: "market", TR: "sawmill" },
    lurker: { CT: "forest-north", TR: "forest-south" },
    sniper: { CT: "river-bridge", TR: "apartments" },
    anchor: { CT: "ct-spawn", TR: "tr-spawn" }
};
const patrolRoutes = {
    CT: {
        entry: ["ct-spawn", "ct-road", "west-alley", "town-square", "east-alley", "tr-road", "tr-spawn"],
        support: ["ct-spawn", "ct-road", "sawmill", "main-street", "market", "warehouse-east"],
        lurker: ["ct-spawn", "ct-road", "sawmill", "main-street", "market", "forest-south", "warehouse-east"],
        sniper: ["apartments", "river-bridge", "church-yard", "town-square"],
        anchor: ["ct-spawn", "west-alley", "apartments", "forest-north", "church-yard"]
    },
    TR: {
        entry: ["tr-spawn", "tr-road", "east-alley", "town-square", "west-alley", "ct-road", "ct-spawn"],
        support: ["tr-spawn", "tr-road", "river-bridge", "town-square", "main-street", "sawmill", "ct-road"],
        lurker: ["tr-spawn", "forest-north", "apartments", "west-alley", "ct-spawn"],
        sniper: ["cabins-east", "river-bridge", "market", "main-street"],
        anchor: ["tr-spawn", "east-alley", "market", "forest-south", "warehouse-east"]
    }
};
const coverNavByTeam = {
    CT: ["ct-spawn", "apartments", "sawmill", "forest-south", "river-bridge"],
    TR: ["tr-spawn", "cabins-east", "market", "forest-north", "river-bridge"]
};
const navPositions = Object.fromEntries(MAP_NAV_POINTS.map((point) => [point.id, point.position]));
const navNeighbors = Object.fromEntries(MAP_NAV_POINTS.map((point) => [point.id, point.neighbors]));
export class AgentSystem {
    createAgents(players) {
        const teamIndexes = { CT: 0, TR: 0 };
        return players
            .filter((player) => player.kind === "bot")
            .map((player) => {
            const role = roleCycle[teamIndexes[player.team] % roleCycle.length];
            teamIndexes[player.team] += 1;
            return createAgent(player, role);
        });
    }
    update(state, now) {
        if (state.match.phase !== "running" || state.match.roundPhase !== "live") {
            return [];
        }
        const combatResults = [];
        const comms = [];
        const events = [];
        for (const agent of state.agents) {
            const player = state.players.find((candidate) => candidate.id === agent.playerId);
            if (!player || !player.alive) {
                agent.brain.state = "Idle";
                continue;
            }
            if (agent.brain.reloadUntil && now < agent.brain.reloadUntil) {
                player.animation = "reload";
                continue;
            }
            if (agent.brain.reloadUntil && now >= agent.brain.reloadUntil) {
                agent.brain.reloadUntil = null;
            }
            agent.perception = perceive(state, player, agent, now);
            updateCombatEvents(state, agent, player, events, now);
            transitionBrain(state, agent, player, now);
            updateMemory(agent, player, now);
            navigate(state, player, agent, now);
            const combat = tryBotShoot(state, agent, player, now);
            if (combat) {
                combatResults.push(combat);
                if (combat.weapon !== "knife") {
                    pushEvent(events, now, "shot_fired", player.team, player.position, agent.id, combat.victimId);
                }
            }
            const message = createCommunication(agent);
            if (message) {
                comms.push({ id: `comm-${now}-${agent.id}`, at: now, fromAgentId: agent.id, team: agent.team, message });
            }
        }
        if (comms.length > 0) {
            state.agentComms = [...state.agentComms, ...comms].slice(-16);
        }
        if (events.length > 0) {
            state.combatEvents = [...state.combatEvents, ...events].slice(-24);
        }
        return combatResults;
    }
}
function createAgent(player, role) {
    const navId = roleNavTargets[role][player.team];
    return {
        id: `agent-${player.id}`,
        playerId: player.id,
        team: player.team,
        role,
        brain: {
            state: "Patrol",
            stateEnteredAt: Date.now(),
            targetEnemyId: null,
            targetNavPointId: navId,
            coverNavPointId: null,
            aimYaw: player.yaw,
            combatConfidence: 0.45,
            reactionReadyAt: Date.now() + 180 + Math.random() * 260,
            nextBurstAt: 0,
            burstShotsLeft: 0,
            reloadUntil: null,
            stuckSince: null,
            strafeDir: Math.random() > 0.5 ? 1 : -1,
            scanYaw: player.yaw,
            hesitateUntil: null
        },
        perception: createEmptyPerception(),
        memory: {
            lastSeenEnemyAt: null,
            lastHeardSoundAt: null,
            currentPath: [navId],
            patrolIndex: roleIndex[role],
            lastKnownPlayerPosition: null
        }
    };
}
function perceive(state, player, agent, now) {
    const enemies = state.players.filter((candidate) => candidate.team !== player.team && candidate.alive);
    const allies = state.players.filter((candidate) => candidate.team === player.team && candidate.alive && candidate.id !== player.id);
    const visibleEnemies = enemies
        .filter((enemy) => distance(player.position, enemy.position) <= visionRange && hasLineOfSight(player.position, enemy.position))
        .sort((a, b) => targetPriority(player, a) - targetPriority(player, b));
    const latestKill = state.events.at(-1);
    const allyVictim = latestKill ? state.players.find((candidate) => candidate.id === latestKill.victimId) : null;
    const allyDied = Boolean(allyVictim && allyVictim.team === player.team && now - latestKill.at < 2500);
    const heardEvent = state.combatEvents
        .filter((event) => event.type === "shot_fired" && event.sourceId !== player.id && now - event.at < 3000 && distance(player.position, event.position) <= hearingRange)
        .at(-1);
    const heardShotAt = heardEvent?.position ?? null;
    const sharedSpot = state.combatEvents
        .filter((event) => event.type === "enemy_spotted" && event.team === player.team && event.sourceId !== agent.id && event.targetId && now - event.at < 4500)
        .at(-1);
    const sharedEnemy = sharedSpot ? state.players.find((candidate) => candidate.id === sharedSpot.targetId && candidate.alive) ?? null : null;
    const primaryEnemy = visibleEnemies[0] ?? sharedEnemy ?? null;
    const visibilityScore = visibleEnemies.length > 0 ? Math.min(1, 0.35 + visibleEnemies.length * 0.2 + (player.health / 100) * 0.15) : 0;
    const allyUnderFire = state.combatEvents.some((event) => event.type === "ally_under_fire" && event.team === player.team && now - event.at < 1800 && distance(player.position, event.position) <= nearbyRange);
    return {
        visibleEnemyIds: visibleEnemies.map((enemy) => enemy.id),
        heardShotAt,
        lastKnownEnemyPosition: primaryEnemy?.position ?? agent.memory.lastKnownPlayerPosition,
        lastKnownEnemyId: primaryEnemy?.id ?? agent.brain.targetEnemyId,
        alliesNearby: allies.filter((ally) => distance(player.position, ally.position) <= nearbyRange).length,
        enemiesNearby: visibleEnemies.length,
        allyUnderFire,
        allyDied,
        visibilityScore
    };
}
function updateCombatEvents(state, agent, player, events, now) {
    if (agent.perception.visibleEnemyIds.length > 0) {
        pushEvent(events, now, "enemy_spotted", player.team, player.position, agent.id, agent.perception.visibleEnemyIds[0]);
    }
    if (agent.perception.allyUnderFire) {
        pushEvent(events, now, "ally_under_fire", player.team, player.position, agent.id, null);
    }
    if (agent.perception.allyDied) {
        pushEvent(events, now, "ally_died", player.team, player.position, agent.id, null);
    }
    if (agent.perception.heardShotAt) {
        pushEvent(events, now, "shots_heard", player.team, agent.perception.heardShotAt, null, null);
    }
}
function pushEvent(events, at, type, team, position, sourceId, targetId) {
    events.push({ id: `evt-${at}-${type}-${events.length}`, at, type, team, position, sourceId, targetId });
}
function transitionBrain(state, agent, player, now) {
    const brain = agent.brain;
    const hasEnemy = agent.perception.visibleEnemyIds.length > 0;
    const lowHealth = player.health < 32;
    const woundedEnemy = findWoundedEnemy(state, agent);
    const heardRecently = agent.perception.heardShotAt && agent.memory.lastHeardSoundAt && now - agent.memory.lastHeardSoundAt < 4000;
    const outnumbered = agent.perception.enemiesNearby > agent.perception.alliesNearby + 1;
    const inCombat = ["Engage", "StrafeCombat", "Chase", "PushEnemy"].includes(brain.state);
    const reachedPatrolTarget = brain.state === "Patrol" && distance(player.position, navPositions[brain.targetNavPointId] ?? player.position) < 1.1;
    if (hasEnemy) {
        brain.targetEnemyId = agent.perception.lastKnownEnemyId;
        brain.combatConfidence = clamp(brain.combatConfidence + 0.12, 0.2, 1);
        agent.memory.lastSeenEnemyAt = now;
        agent.memory.lastKnownPlayerPosition = agent.perception.lastKnownEnemyPosition;
    }
    else if (now - (agent.memory.lastSeenEnemyAt ?? 0) > 5000) {
        brain.combatConfidence = clamp(brain.combatConfidence - 0.04, 0.15, 1);
    }
    let next = brain.state;
    if (brain.reloadUntil && now < brain.reloadUntil) {
        next = "Reload";
    }
    else if (lowHealth && (outnumbered || brain.combatConfidence < 0.35)) {
        next = "Retreat";
        brain.coverNavPointId = pickCover(agent);
        brain.targetNavPointId = brain.coverNavPointId;
    }
    else if (hasEnemy && lowHealth) {
        next = "TakeCover";
        brain.coverNavPointId = pickCover(agent);
        brain.targetNavPointId = brain.coverNavPointId;
    }
    else if (hasEnemy && player.health > 55 && !outnumbered && brain.combatConfidence > 0.65) {
        next = Math.random() > 0.55 ? "PushEnemy" : "Engage";
    }
    else if (hasEnemy) {
        next = distance(player.position, agent.perception.lastKnownEnemyPosition ?? player.position) < 6 ? "StrafeCombat" : "Engage";
    }
    else if (woundedEnemy && brain.combatConfidence > 0.4) {
        next = "Chase";
        brain.targetEnemyId = woundedEnemy.id;
        brain.targetNavPointId = nearestNavPoint(woundedEnemy.position);
    }
    else if (heardRecently || agent.perception.allyUnderFire) {
        next = agent.perception.allyUnderFire ? "Investigate" : "Search";
        brain.targetNavPointId = nearestNavPoint(agent.perception.heardShotAt ?? player.position);
    }
    else if (inCombat && agent.memory.lastKnownPlayerPosition) {
        next = "Search";
        brain.targetNavPointId = nearestNavPoint(agent.memory.lastKnownPlayerPosition);
    }
    else if (brain.state === "Retreat" && player.health > 60) {
        next = "HoldAngle";
        brain.targetNavPointId = roleNavTargets[agent.role][agent.team];
    }
    else if (brain.hesitateUntil && now < brain.hesitateUntil) {
        next = "Idle";
    }
    else if (Math.random() < 0.012) {
        next = "HoldAngle";
        brain.hesitateUntil = now + 180 + Math.random() * 320;
    }
    else {
        next = "Patrol";
        if (reachedPatrolTarget || brain.state !== "Patrol") {
            agent.memory.patrolIndex += 1;
        }
        brain.targetNavPointId = getPatrolTarget(agent);
    }
    if (next !== brain.state) {
        brain.state = next;
        brain.stateEnteredAt = now;
        if (["Engage", "StrafeCombat", "PushEnemy"].includes(next)) {
            brain.reactionReadyAt = now + 80 + Math.random() * 220;
            brain.strafeDir = Math.random() > 0.5 ? 1 : -1;
        }
    }
}
function navigate(state, player, agent, now) {
    const brain = agent.brain;
    const combatMove = ["Engage", "StrafeCombat", "Chase", "PushEnemy", "Retreat", "TakeCover"].includes(brain.state);
    const targetEnemy = agent.perception.lastKnownEnemyPosition;
    let targetNav = navPositions[brain.targetNavPointId];
    if (combatMove && targetEnemy) {
        targetNav = targetEnemy;
    }
    if (!targetNav) {
        return;
    }
    if (brain.state === "StrafeCombat" && targetEnemy) {
        const strafe = perpendicular(targetEnemy, player.position, brain.strafeDir);
        targetNav = strafe;
    }
    if (agent.memory.currentPath.length === 0) {
        agent.memory.currentPath = findPath(nearestNavPoint(player.position), brain.targetNavPointId);
    }
    const nextNavId = agent.memory.currentPath[0];
    const waypoint = navPositions[nextNavId];
    const moveTarget = combatMove && targetEnemy && hasLineOfSight(player.position, targetEnemy) ? targetNav : waypoint ?? targetNav;
    const separation = getSeparation(state, player);
    const dx = moveTarget.x - player.position.x;
    const dz = moveTarget.z - player.position.z;
    const length = Math.hypot(dx, dz);
    const speed = brain.state === "Retreat" || brain.state === "Chase"
        ? 1.28
        : brain.state === "StrafeCombat"
            ? 0.72
            : brain.state === "Patrol"
                ? 0.94
                : 1.04;
    if (length < 0.65) {
        if (nextNavId === agent.memory.currentPath[0]) {
            agent.memory.currentPath.shift();
        }
        if (brain.state === "Patrol" && agent.memory.currentPath.length === 0) {
            agent.memory.patrolIndex += 1;
            brain.targetNavPointId = getPatrolTarget(agent);
            agent.memory.currentPath = findPath(nearestNavPoint(player.position), brain.targetNavPointId);
        }
        player.velocity = dampVelocity(player.velocity);
        player.animation = brain.state === "HoldAngle" || brain.state === "Idle" ? "idle" : velocityAnimation(player.velocity, player.yaw);
        checkStuck(agent, player, now, true);
        return;
    }
    const step = moveStep * speed;
    let moveX = dx / length + separation.x * 0.82;
    let moveZ = dz / length + separation.z * 0.82;
    const moveLength = Math.hypot(moveX, moveZ) || 1;
    moveX /= moveLength;
    moveZ /= moveLength;
    let next = { x: player.position.x + moveX * step, y: 0, z: player.position.z + moveZ * step };
    const unstuck = brain.stuckSince && now - brain.stuckSince > stuckThresholdMs;
    if (unstuck) {
        const escape = randomEscapeDirection(player.position);
        next.x = player.position.x + escape.x * step * 1.4;
        next.z = player.position.z + escape.z * step * 1.4;
        agent.memory.currentPath = findPath(nearestNavPoint(player.position), brain.targetNavPointId);
        brain.stuckSince = null;
    }
    const moved = moveBotWithSlide(player, next);
    if (moved) {
        const previous = player.position;
        player.position = moved;
        player.velocity = { x: moved.x - previous.x, y: 0, z: moved.z - previous.z };
        const lookTarget = targetEnemy ?? moveTarget;
        const desiredYaw = Math.atan2(lookTarget.x - player.position.x, lookTarget.z - player.position.z);
        player.yaw = lerpAngle(player.yaw, desiredYaw, combatMove ? 0.42 : 0.24);
        brain.aimYaw = lerpAngle(brain.aimYaw, desiredYaw, combatMove ? 0.36 : 0.16);
        brain.scanYaw = brain.aimYaw + Math.sin(now / 480) * 0.08;
        player.animation = velocityAnimation(player.velocity, player.yaw);
        checkStuck(agent, player, now, false);
    }
    else {
        agent.memory.currentPath = findPath(nearestNavPoint(player.position), brain.targetNavPointId);
        player.velocity = dampVelocity(player.velocity);
        player.animation = "idle";
        checkStuck(agent, player, now, false);
    }
}
function tryBotShoot(state, agent, player, now) {
    const brain = agent.brain;
    const combatStates = ["Engage", "StrafeCombat", "Chase", "PushEnemy", "TakeCover", "Search", "Investigate"];
    if (!combatStates.includes(brain.state)) {
        return null;
    }
    const target = state.players.find((candidate) => candidate.id === brain.targetEnemyId && candidate.alive)
        ?? state.players.find((candidate) => agent.perception.visibleEnemyIds.includes(candidate.id) && candidate.alive);
    if (!target || now < brain.reactionReadyAt) {
        return null;
    }
    const range = distance(player.position, target.position);
    const weapon = range < 1.8 ? "knife" : player.loadout.primary ?? player.loadout.secondary;
    const maxRange = WEAPON_RANGE[weapon];
    if (range > maxRange || !hasLineOfSight(player.position, target.position)) {
        return null;
    }
    const desiredYaw = Math.atan2(target.position.x - player.position.x, target.position.z - player.position.z);
    player.yaw = lerpAngle(player.yaw, desiredYaw, weapon === "knife" ? 0.7 : 0.55);
    brain.aimYaw = player.yaw;
    if (brain.burstShotsLeft <= 0 && now < brain.nextBurstAt) {
        return null;
    }
    if (brain.burstShotsLeft <= 0) {
        brain.burstShotsLeft = weapon === "rifle" ? 3 + Math.floor(Math.random() * 3) : weapon === "pistol" ? 2 : 1;
        brain.nextBurstAt = now + WEAPON_FIRE_RATE_MS[weapon] * brain.burstShotsLeft;
    }
    brain.burstShotsLeft -= 1;
    brain.nextBurstAt = now + WEAPON_FIRE_RATE_MS[weapon];
    player.weapon = weapon;
    player.loadout.equipped = weapon;
    player.animation = weapon === "knife" ? "knife" : "shoot";
    player.lastActionAt = now;
    const aimError = (1 - agent.perception.visibilityScore) * WEAPON_SPREAD[weapon] + (1 - brain.combatConfidence) * 0.045;
    const hitChance = clamp(0.94 - aimError * 1.7 - range / (maxRange * 3.0), 0.24, 0.9);
    const hit = Math.random() <= hitChance;
    const damage = hit ? Math.round(WEAPON_DAMAGE[weapon] * (range > maxRange * 0.65 && weapon !== "sniper" ? 0.78 : 1)) : 0;
    if (brain.burstShotsLeft <= 0 && Math.random() < 0.14) {
        brain.reloadUntil = now + 900 + Math.random() * 500;
        brain.burstShotsLeft = 0;
    }
    return { attackerId: player.id, victimId: target.id, weapon, damage, hit };
}
function createCommunication(agent) {
    if (agent.perception.visibleEnemyIds.length > 0) {
        return `Contact ${agent.perception.visibleEnemyIds[0]} [${agent.brain.state}]`;
    }
    if (agent.perception.allyUnderFire) {
        return "Rotating to help";
    }
    if (agent.brain.state === "Retreat") {
        return "Falling back";
    }
    return null;
}
function updateMemory(agent, player, now) {
    if (agent.perception.heardShotAt) {
        agent.memory.lastHeardSoundAt = now;
    }
    if (agent.perception.lastKnownEnemyPosition) {
        agent.memory.lastKnownPlayerPosition = agent.perception.lastKnownEnemyPosition;
    }
    const previousTarget = agent.memory.currentPath.at(-1);
    if (previousTarget !== agent.brain.targetNavPointId || agent.memory.currentPath.length === 0) {
        agent.memory.currentPath = findPath(nearestNavPoint(player.position), agent.brain.targetNavPointId);
    }
}
function findWoundedEnemy(state, agent) {
    return (state.players.find((candidate) => candidate.team !== agent.team &&
        candidate.alive &&
        candidate.health > 0 &&
        candidate.health < 45 &&
        agent.memory.lastKnownPlayerPosition &&
        distance(candidate.position, agent.memory.lastKnownPlayerPosition) < 12) ?? null);
}
function pickCover(agent) {
    const options = coverNavByTeam[agent.team];
    return options[Math.floor(Math.random() * options.length)] ?? roleNavTargets[agent.role][agent.team];
}
function getPatrolTarget(agent) {
    const route = patrolRoutes[agent.team][agent.role];
    return route[agent.memory.patrolIndex % route.length] ?? roleNavTargets[agent.role][agent.team];
}
function targetPriority(player, enemy) {
    const lowHealthBias = enemy.health < 45 ? -3 : 0;
    const humanBias = enemy.kind === "human" ? -1.2 : 0;
    return distance(player.position, enemy.position) + lowHealthBias + humanBias;
}
function getSeparation(state, player) {
    const separation = { x: 0, y: 0, z: 0 };
    for (const other of state.players) {
        if (other.id === player.id || !other.alive || other.team !== player.team) {
            continue;
        }
        const dx = player.position.x - other.position.x;
        const dz = player.position.z - other.position.z;
        const gap = Math.hypot(dx, dz);
        if (gap <= 0.001 || gap > 1.65) {
            continue;
        }
        const strength = (1.65 - gap) / 1.65;
        separation.x += (dx / gap) * strength;
        separation.z += (dz / gap) * strength;
    }
    return separation;
}
function moveBotWithSlide(player, next) {
    if (!intersectsCollider(next.x, next.z)) {
        return next;
    }
    const slideX = { x: next.x, y: 0, z: player.position.z };
    if (!intersectsCollider(slideX.x, slideX.z)) {
        return slideX;
    }
    const slideZ = { x: player.position.x, y: 0, z: next.z };
    if (!intersectsCollider(slideZ.x, slideZ.z)) {
        return slideZ;
    }
    return null;
}
function checkStuck(agent, player, now, arrived) {
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    if (arrived || speed > 0.04) {
        agent.brain.stuckSince = null;
        return;
    }
    if (!agent.brain.stuckSince) {
        agent.brain.stuckSince = now;
    }
}
function randomEscapeDirection(position) {
    const angle = Math.random() * Math.PI * 2;
    const candidate = { x: Math.sin(angle), y: 0, z: Math.cos(angle) };
    const next = { x: position.x + candidate.x, y: 0, z: position.z + candidate.z };
    if (!intersectsCollider(next.x, next.z)) {
        return candidate;
    }
    return { x: -candidate.x, y: 0, z: -candidate.z };
}
function perpendicular(target, origin, dir) {
    const dx = target.x - origin.x;
    const dz = target.z - origin.z;
    const len = Math.hypot(dx, dz) || 1;
    return { x: origin.x + (-dz / len) * 2.2 * dir, y: 0, z: origin.z + (dx / len) * 2.2 * dir };
}
function nearestNavPoint(position) {
    return Object.entries(navPositions).reduce((best, [id, navPosition]) => {
        const navDistance = distance(position, navPosition);
        return navDistance < best.distance ? { id, distance: navDistance } : best;
    }, { id: "town-square", distance: Infinity }).id;
}
function findPath(start, goal) {
    if (!navPositions[start] || !navPositions[goal]) {
        return navPositions[goal] ? [goal] : [];
    }
    if (start === goal) {
        return [goal];
    }
    const open = new Set([start]);
    const cameFrom = new Map();
    const gScore = new Map([[start, 0]]);
    const fScore = new Map([[start, distance(navPositions[start], navPositions[goal])]]);
    while (open.size > 0) {
        const current = [...open].reduce((best, candidate) => (score(fScore, candidate) < score(fScore, best) ? candidate : best));
        if (current === goal) {
            return reconstructPath(cameFrom, current).slice(1);
        }
        open.delete(current);
        for (const neighbor of navNeighbors[current] ?? []) {
            const tentative = score(gScore, current) + distance(navPositions[current], navPositions[neighbor]);
            if (tentative >= score(gScore, neighbor)) {
                continue;
            }
            cameFrom.set(neighbor, current);
            gScore.set(neighbor, tentative);
            fScore.set(neighbor, tentative + distance(navPositions[neighbor], navPositions[goal]));
            open.add(neighbor);
        }
    }
    return [goal];
}
function reconstructPath(cameFrom, current) {
    const path = [current];
    while (cameFrom.has(current)) {
        current = cameFrom.get(current) ?? current;
        path.unshift(current);
    }
    return path;
}
function score(scores, id) {
    return scores.get(id) ?? Infinity;
}
function hasLineOfSight(a, b) {
    return !MAP_COLLIDERS.some((collider) => segmentIntersectsBox(a.x, a.z, b.x, b.z, collider.minX - botRadius, collider.minZ - botRadius, collider.maxX + botRadius, collider.maxZ + botRadius));
}
function intersectsCollider(x, z) {
    return MAP_COLLIDERS.some((collider) => x + botRadius > collider.minX && x - botRadius < collider.maxX && z + botRadius > collider.minZ && z - botRadius < collider.maxZ);
}
function segmentIntersectsBox(x1, z1, x2, z2, minX, minZ, maxX, maxZ) {
    const steps = Math.max(4, Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 0.4));
    for (let index = 0; index <= steps; index += 1) {
        const t = index / steps;
        const x = x1 + (x2 - x1) * t;
        const z = z1 + (z2 - z1) * t;
        if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
            return true;
        }
    }
    return false;
}
function velocityAnimation(velocity, yaw) {
    const speed = Math.hypot(velocity.x, velocity.z);
    if (speed < 0.025) {
        return "idle";
    }
    const moveYaw = Math.atan2(velocity.x, velocity.z);
    const diff = normalizeAngle(moveYaw - yaw);
    if (Math.abs(diff) > 1.1) {
        return diff < 0 ? "strafe_left" : "strafe_right";
    }
    return speed > 0.29 ? "run" : "walk";
}
function dampVelocity(velocity) {
    return { x: velocity.x * 0.55, y: 0, z: velocity.z * 0.55 };
}
function lerpAngle(current, target, alpha) {
    return current + normalizeAngle(target - current) * alpha;
}
function normalizeAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
}
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function createEmptyPerception() {
    return {
        visibleEnemyIds: [],
        heardShotAt: null,
        lastKnownEnemyPosition: null,
        lastKnownEnemyId: null,
        alliesNearby: 0,
        enemiesNearby: 0,
        allyUnderFire: false,
        allyDied: false,
        visibilityScore: 0
    };
}
