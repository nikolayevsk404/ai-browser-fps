export const MAP_SPAWNS = {
    CT: [
        { x: -30, y: 0, z: -21 },
        { x: -27, y: 0, z: -22 },
        { x: -24, y: 0, z: -21 },
        { x: -30, y: 0, z: -18 },
        { x: -26, y: 0, z: -18 }
    ],
    TR: [
        { x: 30, y: 0, z: 21 },
        { x: 27, y: 0, z: 22 },
        { x: 24, y: 0, z: 21 },
        { x: 30, y: 0, z: 18 },
        { x: 26, y: 0, z: 18 }
    ]
};
export const MAP_DEATHMATCH_SPAWNS = [
    { x: -30, y: 0, z: -21 },
    { x: -15, y: 0, z: -23 },
    { x: 0, y: 0, z: -24 },
    { x: 13, y: 0, z: -22 },
    { x: 30, y: 0, z: -18 },
    { x: 31, y: 0, z: 0 },
    { x: 30, y: 0, z: 21 },
    { x: 12, y: 0, z: 23 },
    { x: -12, y: 0, z: 23 },
    { x: -30, y: 0, z: 20 },
    { x: -31, y: 0, z: 2 },
    { x: -12, y: 0, z: -9 },
    { x: 12, y: 0, z: 9 },
    { x: 19, y: 0, z: -13 },
    { x: -20, y: 0, z: 19 }
];
export const MAP_COLLIDERS = [
    { id: "north-forest-bound", minX: -35, maxX: 35, minZ: 26, maxZ: 27, height: 4.2, kind: "wall" },
    { id: "south-forest-bound", minX: -35, maxX: 35, minZ: -27, maxZ: -26, height: 4.2, kind: "wall" },
    { id: "west-forest-bound", minX: -35, maxX: -34, minZ: -27, maxZ: 27, height: 4.2, kind: "wall" },
    { id: "east-forest-bound", minX: 34, maxX: 35, minZ: -27, maxZ: 27, height: 4.2, kind: "wall" },
    { id: "west-apartments", minX: -23, maxX: -17, minZ: -5, maxZ: 7, height: 4.0, kind: "wall" },
    { id: "east-market", minX: 17, maxX: 24, minZ: -6, maxZ: 6, height: 3.5, kind: "wall" },
    { id: "north-church", minX: -5, maxX: 6, minZ: 15, maxZ: 22, height: 5.0, kind: "wall" },
    { id: "south-sawmill", minX: -9, maxX: 9, minZ: -22, maxZ: -15, height: 3.2, kind: "wall" },
    { id: "west-warehouse", minX: -29, maxX: -21, minZ: -18, maxZ: -10, height: 3.4, kind: "wall" },
    { id: "east-warehouse", minX: 20, maxX: 29, minZ: -18, maxZ: -10, height: 3.4, kind: "wall" },
    { id: "northwest-cabins", minX: -30, maxX: -23, minZ: 11, maxZ: 18, height: 2.8, kind: "wall" },
    { id: "northeast-cabins", minX: 23, maxX: 30, minZ: 9, maxZ: 17, height: 2.8, kind: "wall" },
    { id: "square-fountain", minX: -4.2, maxX: -2.0, minZ: 1.5, maxZ: 3.7, height: 1.15, kind: "cover" },
    { id: "town-car-west", minX: -10, maxX: -7, minZ: 2, maxZ: 4, height: 1.2, kind: "cover" },
    { id: "town-car-east", minX: 7, maxX: 10, minZ: -4, maxZ: -2, height: 1.2, kind: "cover" },
    { id: "bridge-truck", minX: 8, maxX: 11, minZ: 9, maxZ: 11.5, height: 1.5, kind: "cover" },
    { id: "sawmill-logs", minX: -16, maxX: -11, minZ: -17, maxZ: -14, height: 1.1, kind: "cover" },
    { id: "market-stalls", minX: 10, maxX: 15, minZ: -15, maxZ: -13, height: 1.3, kind: "cover" },
    { id: "forest-rock-north", minX: -15, maxX: -11, minZ: 16, maxZ: 19, height: 1.7, kind: "cover" },
    { id: "forest-rock-south", minX: 12, maxX: 16, minZ: -19, maxZ: -16, height: 1.6, kind: "cover" },
    { id: "road-barricade-west", minX: -15, maxX: -12, minZ: -9, maxZ: -7, height: 1.4, kind: "gate" },
    { id: "road-barricade-east", minX: 12, maxX: 15, minZ: 7, maxZ: 9, height: 1.4, kind: "gate" }
];
export const MAP_NAV_POINTS = [
    { id: "ct-spawn", position: { x: -28, y: 0, z: -21 }, neighbors: ["ct-road"] },
    { id: "ct-road", position: { x: -18, y: 0, z: -22 }, neighbors: ["ct-spawn", "sawmill", "west-alley"] },
    { id: "tr-spawn", position: { x: 28, y: 0, z: 21 }, neighbors: ["tr-road", "church-yard", "cabins-east"] },
    { id: "tr-road", position: { x: 18, y: 0, z: 22 }, neighbors: ["tr-spawn", "east-alley", "cabins-east", "river-bridge"] },
    { id: "town-square", position: { x: 0, y: 0, z: 5 }, neighbors: ["main-street", "west-alley", "east-alley", "river-bridge", "church-yard"] },
    { id: "main-street", position: { x: 0, y: 0, z: -5 }, neighbors: ["town-square", "sawmill", "market", "west-alley", "east-alley"] },
    { id: "west-alley", position: { x: -14, y: 0, z: -2 }, neighbors: ["ct-spawn", "town-square", "main-street", "apartments", "sawmill"] },
    { id: "east-alley", position: { x: 14, y: 0, z: 2 }, neighbors: ["tr-spawn", "town-square", "main-street", "market", "cabins-east"] },
    { id: "market", position: { x: 13, y: 0, z: -10 }, neighbors: ["main-street", "east-alley", "warehouse-east", "forest-south"] },
    { id: "sawmill", position: { x: -10, y: 0, z: -13 }, neighbors: ["ct-road", "west-alley", "main-street"] },
    { id: "church-yard", position: { x: -2, y: 0, z: 12 }, neighbors: ["town-square", "river-bridge", "forest-north", "tr-spawn"] },
    { id: "river-bridge", position: { x: 7, y: 0, z: 12 }, neighbors: ["town-square", "church-yard", "tr-road", "cabins-east"] },
    { id: "apartments", position: { x: -14, y: 0, z: 9 }, neighbors: ["west-alley", "forest-north", "cabins-west", "town-square"] },
    { id: "warehouse-east", position: { x: 18, y: 0, z: -13 }, neighbors: ["market", "forest-south", "east-alley"] },
    { id: "forest-north", position: { x: -17, y: 0, z: 19 }, neighbors: ["apartments", "cabins-west", "church-yard", "tr-spawn"] },
    { id: "forest-south", position: { x: 13, y: 0, z: -21 }, neighbors: ["market", "warehouse-east"] },
    { id: "cabins-west", position: { x: -20, y: 0, z: 19 }, neighbors: ["forest-north", "apartments", "church-yard"] },
    { id: "cabins-east", position: { x: 20, y: 0, z: 19 }, neighbors: ["tr-spawn", "river-bridge", "east-alley"] }
];
