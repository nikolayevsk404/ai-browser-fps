import { MAP_COLLIDERS, TDM_RESPAWN_DELAY_MS, TDM_SCORE_LIMIT, TDM_SPAWN_INVULN_MS, WEAPON_DAMAGE, WEAPON_RANGE } from "@ai-browser-fps/shared";
import { AgentSystem } from "../agents/AgentSystem.js";
import { PlayerProfileSystem } from "../agents/PlayerProfileSystem.js";
import { createInitialState } from "./createInitialState.js";
import { getDeathmatchSpawn } from "./spawns.js";
const tickRateMs = 100;
export class GameEngine {
    state = createInitialState(Date.now(), "CT", "lobby");
    agentSystem = new AgentSystem();
    playerProfileSystem = new PlayerProfileSystem();
    getState() {
        return this.state;
    }
    tick(now = Date.now()) {
        this.state.tick += 1;
        this.state.serverTime = now;
        if (this.state.match.phase !== "running") {
            return this.state;
        }
        if (now >= this.state.match.endsAt) {
            this.endMatch(now);
            return this.state;
        }
        this.processRespawns(now);
        this.updateTransientAnimations(now);
        const botHits = this.agentSystem.update(this.state, now);
        for (const hit of botHits) {
            if (!hit.hit || hit.damage <= 0) {
                continue;
            }
            const attacker = this.state.players.find((player) => player.id === hit.attackerId);
            const victim = this.state.players.find((player) => player.id === hit.victimId);
            if (attacker && victim) {
                this.applyDamage(attacker, victim, hit.damage, now, hit.weapon);
            }
        }
        this.checkScoreLimit(now);
        return this.state;
    }
    getTickRateMs() {
        return tickRateMs;
    }
    selectTeam(team, now = Date.now()) {
        const previousProfile = this.state.playerProfile;
        this.state = createInitialState(now, team);
        this.state.playerProfile = previousProfile;
    }
    restartMatch(now = Date.now()) {
        const team = this.state.match.selectedTeam;
        const profile = this.state.playerProfile;
        this.state = createInitialState(now, team);
        this.state.playerProfile = profile;
        this.playerProfileSystem.resetMatchMemory();
    }
    equipWeapon(weapon) {
        const player = this.state.players.find((candidate) => candidate.id === "player");
        if (!player || !player.alive || !hasWeapon(player, weapon)) {
            return false;
        }
        player.weapon = weapon;
        player.loadout.equipped = weapon;
        player.animation = "idle";
        player.lastActionAt = Date.now();
        return true;
    }
    shoot(origin, direction, weapon, now = Date.now()) {
        if (this.state.match.phase !== "running") {
            return false;
        }
        const attacker = this.state.players.find((candidate) => candidate.id === "player");
        if (!attacker || !attacker.alive || !hasWeapon(attacker, weapon)) {
            return false;
        }
        attacker.weapon = weapon;
        attacker.loadout.equipped = weapon;
        attacker.animation = weapon === "knife" ? "knife" : "shoot";
        attacker.lastActionAt = now;
        if (weapon !== "knife") {
            this.addCombatEvent({
                id: `evt-${now}-player-shot`,
                at: now,
                type: "shot_fired",
                team: attacker.team,
                position: attacker.position,
                sourceId: attacker.id,
                targetId: null
            });
        }
        const victim = weapon === "knife"
            ? this.findMeleeTarget(attacker, origin, direction)
            : this.findRayTarget(attacker, origin, direction, WEAPON_RANGE[weapon]);
        if (!victim || this.isSpawnProtected(victim, now)) {
            return true;
        }
        this.applyDamage(attacker, victim, WEAPON_DAMAGE[weapon], now, weapon);
        return true;
    }
    updatePlayerPosition(position) {
        const player = this.state.players.find((candidate) => candidate.id === "player");
        if (!player || !player.alive) {
            return;
        }
        player.velocity = { x: position.x - player.position.x, y: 0, z: position.z - player.position.z };
        if (Math.hypot(player.velocity.x, player.velocity.z) > 0.001) {
            player.yaw = Math.atan2(player.velocity.x, player.velocity.z);
            player.animation = Math.hypot(player.velocity.x, player.velocity.z) > 0.22 ? "run" : "walk";
        }
        else if (player.animation !== "shoot" && player.animation !== "reload") {
            player.animation = "idle";
        }
        player.position = position;
        this.playerProfileSystem.observePosition(this.state.playerProfile, position);
    }
    applyDamage(attacker, victim, damage, now, weapon) {
        if (this.isSpawnProtected(victim, now)) {
            return;
        }
        victim.health = Math.max(0, victim.health - damage);
        victim.animation = "hit";
        victim.lastActionAt = now;
        if (victim.health > 0) {
            return;
        }
        victim.alive = false;
        victim.animation = "death";
        victim.stats.deaths += 1;
        victim.respawnAt = now + TDM_RESPAWN_DELAY_MS;
        attacker.stats.kills += 1;
        this.state.match.teams[attacker.team].score += 1;
        this.state.events = [
            ...this.state.events.slice(-19),
            {
                id: `kill-${this.state.tick}`,
                at: now,
                attackerId: attacker.id,
                victimId: victim.id,
                weapon
            }
        ];
        this.observePlayerCombat(attacker, victim, now);
        this.checkScoreLimit(now);
    }
    processRespawns(now) {
        for (const player of this.state.players) {
            if (!player.respawnAt || now < player.respawnAt) {
                continue;
            }
            if (player.alive) {
                player.respawnAt = null;
                continue;
            }
            this.respawnPlayer(player, now);
        }
    }
    isSpawnProtected(player, now) {
        return Boolean(player.respawnAt && now < player.respawnAt);
    }
    updateTransientAnimations(now) {
        for (const player of this.state.players) {
            if (!player.alive) {
                continue;
            }
            const elapsed = now - player.lastActionAt;
            const transient = player.animation === "shoot" || player.animation === "knife" || player.animation === "hit" || player.animation === "reload";
            if (!transient || elapsed < getAnimationDuration(player.animation)) {
                continue;
            }
            const speed = Math.hypot(player.velocity.x, player.velocity.z);
            player.animation = speed > 0.14 ? "walk" : "idle";
        }
    }
    addCombatEvent(event) {
        this.state.combatEvents = [...this.state.combatEvents, event].slice(-24);
    }
    checkScoreLimit(now) {
        if (this.state.match.phase !== "running") {
            return;
        }
        const ct = this.state.match.teams.CT.score;
        const tr = this.state.match.teams.TR.score;
        if (ct >= TDM_SCORE_LIMIT || tr >= TDM_SCORE_LIMIT) {
            this.endMatch(now);
        }
    }
    respawnPlayer(player, now) {
        player.alive = true;
        player.health = 100;
        player.position = getDeathmatchSpawn(this.state.players, player);
        player.velocity = { x: 0, y: 0, z: 0 };
        player.yaw = Math.atan2(-player.position.x, -player.position.z);
        player.weapon = player.loadout.primary ?? player.loadout.secondary;
        player.loadout.equipped = player.weapon;
        player.animation = "idle";
        player.lastActionAt = now;
        player.respawnAt = now + TDM_SPAWN_INVULN_MS;
    }
    endMatch(now) {
        if (this.state.match.phase === "ended") {
            return;
        }
        this.state.match.phase = "ended";
        this.state.match.winner = this.resolveMatchWinner();
        this.state.match.endsAt = now;
        this.state.playerProfile.matchesObserved += 1;
    }
    resolveMatchWinner() {
        const ctScore = this.state.match.teams.CT.score;
        const trScore = this.state.match.teams.TR.score;
        if (ctScore === trScore) {
            return "draw";
        }
        return ctScore > trScore ? "CT" : "TR";
    }
    observePlayerCombat(attacker, victim, now) {
        if (attacker.id !== "player" && victim.id !== "player") {
            return;
        }
        const elapsed = now - this.state.match.startedAt;
        this.playerProfileSystem.observeContact(this.state.playerProfile, elapsed);
        if (attacker.id === "player") {
            this.state.playerProfile.aggressionScore = Math.min(1, this.state.playerProfile.aggressionScore + 0.12);
        }
    }
    findRayTarget(attacker, origin, direction, maxRange) {
        const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
        const normalized = { x: direction.x / length, y: direction.y / length, z: direction.z / length };
        let best = null;
        for (const candidate of this.state.players) {
            if (candidate.team === attacker.team || !candidate.alive) {
                continue;
            }
            const toTarget = {
                x: candidate.position.x - origin.x,
                y: 1.0 - origin.y,
                z: candidate.position.z - origin.z
            };
            const projected = toTarget.x * normalized.x + toTarget.y * normalized.y + toTarget.z * normalized.z;
            if (projected < 0 || projected > maxRange) {
                continue;
            }
            const closest = {
                x: origin.x + normalized.x * projected,
                y: origin.y + normalized.y * projected,
                z: origin.z + normalized.z * projected
            };
            const miss = Math.hypot(candidate.position.x - closest.x, candidate.position.z - closest.z);
            if (miss > 0.55 || !hasLineOfSight(origin, candidate.position)) {
                continue;
            }
            if (!best || projected < best.distance) {
                best = { player: candidate, distance: projected };
            }
        }
        return best?.player ?? null;
    }
    findMeleeTarget(attacker, origin, direction) {
        const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
        const normalized = { x: direction.x / length, y: direction.y / length, z: direction.z / length };
        return (this.state.players.find((candidate) => {
            if (candidate.team === attacker.team || !candidate.alive) {
                return false;
            }
            const dx = candidate.position.x - origin.x;
            const dz = candidate.position.z - origin.z;
            const range = Math.hypot(dx, dz);
            if (range > 1.65 || !hasLineOfSight(origin, candidate.position)) {
                return false;
            }
            const facing = (dx / (range || 1)) * normalized.x + (dz / (range || 1)) * normalized.z;
            return facing > 0.45;
        }) ?? null);
    }
}
function hasWeapon(player, weapon) {
    return player.loadout.equipped === weapon || player.loadout.primary === weapon || player.loadout.secondary === weapon || player.loadout.melee === weapon;
}
function getAnimationDuration(animation) {
    if (animation === "reload") {
        return 950;
    }
    if (animation === "knife") {
        return 420;
    }
    if (animation === "hit") {
        return 260;
    }
    return 180;
}
function hasLineOfSight(a, b) {
    return !MAP_COLLIDERS.some((collider) => {
        const steps = Math.max(4, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.45));
        for (let index = 0; index <= steps; index += 1) {
            const t = index / steps;
            const x = a.x + (b.x - a.x) * t;
            const z = a.z + (b.z - a.z) * t;
            if (x >= collider.minX && x <= collider.maxX && z >= collider.minZ && z <= collider.maxZ) {
                return true;
            }
        }
        return false;
    });
}
