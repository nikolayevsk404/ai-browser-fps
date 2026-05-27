import test from "node:test";
import assert from "node:assert/strict";
import { AgentSystem } from "./AgentSystem.js";
import { createInitialState } from "../game/createInitialState.js";
test("creates one agent for every bot with role and brain state", () => {
    const state = createInitialState(Date.now(), "CT");
    const system = new AgentSystem();
    const agents = system.createAgents(state.players);
    const botCount = state.players.filter((player) => player.kind === "bot").length;
    assert.equal(agents.length, botCount);
    assert.ok(agents.every((agent) => agent.role));
    assert.ok(agents.every((agent) => agent.brain.state));
});
test("updates agents with brain states during running match", () => {
    const state = createInitialState(Date.now(), "CT");
    const system = new AgentSystem();
    system.update(state, Date.now());
    assert.ok(state.agents.some((agent) => agent.brain.state !== "Idle"));
    assert.ok(state.agents.every((agent) => agent.memory.currentPath.length > 0));
});
