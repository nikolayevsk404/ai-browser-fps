import type { PlayerProfile, RouteId, Vector3 } from "@ai-browser-fps/shared";

const routeIds: RouteId[] = ["town_square", "market", "sawmill", "church", "bridge", "north_forest", "south_forest", "camp"];

export function createInitialPlayerProfile(): PlayerProfile {
  return {
    preferredRoutes: createRouteRecord(),
    aggressionScore: 0,
    averageContactTime: 0,
    campingScore: 0,
    positionHeat: createRouteRecord(),
    matchesObserved: 0,
    summary: "Learning baseline"
  };
}

export class PlayerProfileSystem {
  private lastRoute: RouteId | null = null;
  private sameRouteTicks = 0;

  observePosition(profile: PlayerProfile, position: Vector3): void {
    const route = classifyRoute(position);
    profile.preferredRoutes[route] += 1;
    profile.positionHeat[route] += 1;

    if (this.lastRoute === route) {
      this.sameRouteTicks += 1;
    } else {
      this.lastRoute = route;
      this.sameRouteTicks = 0;
    }

    if (this.sameRouteTicks > 12) {
      profile.campingScore = clamp01(profile.campingScore + 0.015);
    } else {
      profile.campingScore = clamp01(profile.campingScore * 0.995);
    }

    profile.summary = summarizeProfile(profile);
  }

  observeContact(profile: PlayerProfile, contactTimeMs: number): void {
    profile.matchesObserved += 1;
    profile.averageContactTime =
      profile.averageContactTime === 0 ? contactTimeMs : Math.round((profile.averageContactTime + contactTimeMs) / 2);
    profile.aggressionScore = clamp01(profile.aggressionScore + (contactTimeMs < 18000 ? 0.18 : -0.06));
    profile.summary = summarizeProfile(profile);
  }

  resetMatchMemory(): void {
    this.lastRoute = null;
    this.sameRouteTicks = 0;
  }
}

export function classifyRoute(position: Vector3): RouteId {
  if (position.z > 14 && position.x < -8) return "north_forest";
  if (position.z < -14 && position.x > 6) return "south_forest";
  if (position.x > 9 && position.z < -4) return "market";
  if (position.x < -5 && position.z < -9) return "sawmill";
  if (position.z > 10 && Math.abs(position.x) <= 8) return "church";
  if (position.z > 8 && position.x > 5) return "bridge";
  if (Math.abs(position.x) <= 10 && Math.abs(position.z) <= 9) return "town_square";
  return "camp";
}

export function summarizeProfile(profile: PlayerProfile): string {
  const route = topKey(profile.preferredRoutes);
  return `Route focus: ${route}`;
}

function createRouteRecord(): Record<RouteId, number> {
  return Object.fromEntries(routeIds.map((route) => [route, 0])) as Record<RouteId, number>;
}

function topKey<T extends string>(record: Record<T, number>): T {
  return Object.entries(record).reduce(
    (best, [key, value]) => (Number(value) > best.value ? { key: key as T, value: Number(value) } : best),
    { key: Object.keys(record)[0] as T, value: -Infinity }
  ).key;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
