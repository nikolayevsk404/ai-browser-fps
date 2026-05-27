import test from "node:test";
import assert from "node:assert/strict";
import { PlayerProfileSystem, classifyRoute, createInitialPlayerProfile } from "./PlayerProfileSystem.js";
test("classifies key Abandoned City map regions", () => {
    assert.equal(classifyRoute({ x: 0, y: 0, z: 0 }), "town_square");
    assert.equal(classifyRoute({ x: 14, y: 0, z: -8 }), "market");
    assert.equal(classifyRoute({ x: -10, y: 0, z: -13 }), "sawmill");
    assert.equal(classifyRoute({ x: -17, y: 0, z: 19 }), "north_forest");
});
test("learns repeated route and camping tendency", () => {
    const profile = createInitialPlayerProfile();
    const system = new PlayerProfileSystem();
    for (let index = 0; index < 20; index += 1) {
        system.observePosition(profile, { x: -17, y: 0, z: 19 });
    }
    assert.equal(profile.preferredRoutes.north_forest, 20);
    assert.ok(profile.campingScore > 0);
    assert.match(profile.summary, /north_forest/);
});
