import type { WeaponId } from "../types/game.js";

export const WEAPON_DAMAGE: Record<WeaponId, number> = {
  knife: 55,
  pistol: 22,
  rifle: 34,
  sniper: 90
};

export const WEAPON_SPREAD: Record<WeaponId, number> = {
  knife: 0,
  pistol: 0.08,
  rifle: 0.05,
  sniper: 0.02
};

export const WEAPON_RANGE: Record<WeaponId, number> = {
  knife: 2.1,
  pistol: 18,
  rifle: 28,
  sniper: 42
};

export const WEAPON_FIRE_RATE_MS: Record<WeaponId, number> = {
  knife: 420,
  pistol: 280,
  rifle: 95,
  sniper: 900
};
