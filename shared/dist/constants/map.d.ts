import type { TeamId, Vector3 } from "../types/game.js";
export declare const MAP_SPAWNS: Record<TeamId, Vector3[]>;
export declare const MAP_DEATHMATCH_SPAWNS: Vector3[];
export type MapCollider = {
    id: string;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    height: number;
    kind: "wall" | "cover" | "gate";
};
export type SharedNavPoint = {
    id: string;
    position: Vector3;
    neighbors: string[];
};
export declare const MAP_COLLIDERS: MapCollider[];
export declare const MAP_NAV_POINTS: SharedNavPoint[];
//# sourceMappingURL=map.d.ts.map