import type { Vector3 } from "@ai-browser-fps/shared";
import { MAP_COLLIDERS, MAP_NAV_POINTS, MAP_SPAWNS } from "@ai-browser-fps/shared";

export type Collider = {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  kind: "wall" | "cover" | "gate";
};

export type MapZone = {
  id: string;
  label: string;
  center: Vector3;
  size: { x: number; z: number };
  color: number;
};

export type NavPoint = {
  id: string;
  label: string;
  position: Vector3;
  neighbors: string[];
};

export const mapBounds = {
  minX: -35,
  maxX: 35,
  minZ: -27,
  maxZ: 27
};

export const playerStart: Vector3 = { x: -30, y: 0, z: -21 };

export const spawnPoints = MAP_SPAWNS;

export const zones: MapZone[] = [
  {
    id: "ct-spawn",
    label: "",
    center: { x: -28, y: 0.02, z: -21 },
    size: { x: 10, z: 8 },
    color: 0x355f7a
  },
  {
    id: "tr-spawn",
    label: "",
    center: { x: 28, y: 0.02, z: 21 },
    size: { x: 10, z: 8 },
    color: 0x7a4b36
  },
  {
    id: "town-square",
    label: "",
    center: { x: 0, y: 0.03, z: 2 },
    size: { x: 18, z: 14 },
    color: 0x777767
  },
  {
    id: "market",
    label: "",
    center: { x: 15, y: 0.03, z: -7 },
    size: { x: 13, z: 10 },
    color: 0x8a704a
  },
  {
    id: "sawmill",
    label: "",
    center: { x: -8, y: 0.03, z: -17 },
    size: { x: 18, z: 10 },
    color: 0x7b6041
  },
  {
    id: "church",
    label: "",
    center: { x: 0, y: 0.03, z: 15 },
    size: { x: 16, z: 11 },
    color: 0x69755c
  },
  {
    id: "forest-north",
    label: "",
    center: { x: -18, y: 0.02, z: 19 },
    size: { x: 20, z: 10 },
    color: 0x3f6b45
  },
  {
    id: "forest-south",
    label: "",
    center: { x: 14, y: 0.02, z: -20 },
    size: { x: 20, z: 10 },
    color: 0x3f6b45
  },
  {
    id: "bridge",
    label: "",
    center: { x: 7, y: 0.02, z: 12 },
    size: { x: 12, z: 7 },
    color: 0x4b6f82
  }
];

export const colliders: Collider[] = MAP_COLLIDERS;

export const navPoints: NavPoint[] = MAP_NAV_POINTS.map((point) => ({ ...point, label: point.id }));
