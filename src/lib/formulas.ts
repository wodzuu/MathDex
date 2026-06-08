/**
 * Core game formula implementations derived from the game design specification.
 *
 * All functions are pure — no side effects, no store access.
 * Import these wherever game mechanics need to be calculated.
 *
 * Spec references inline on each function.
 */

import type { BaseStats } from '../types/pokemon';

// ── Stat formula ──────────────────────────────────────────────────────────────
// Spec §6.1: Stat at level N = floor((2 × Base + 15) × N ÷ 100) + 5
//            HP at level N  = same formula + N + 10
// IVs are fixed at 15, EVs = 0, natures neutral in the simplified core.

export function calcStat(base: number, level: number): number {
  return Math.floor((2 * base + 15) * level / 100) + 5;
}

export function calcHp(base: number, level: number): number {
  return Math.floor((2 * base + 15) * level / 100) + level + 10;
}

export interface ComputedStats extends BaseStats {
  /** Alias for hp when used as max HP. */
  maxHp: number;
}

/**
 * Compute all six stats + maxHp for a Pokémon at the given level.
 * Call this whenever level changes or on battle start — do not cache in state.
 */
export function calcAllStats(baseStats: BaseStats, level: number): ComputedStats {
  return {
    hp:      calcHp(baseStats.hp, level),
    attack:  calcStat(baseStats.attack, level),
    defense: calcStat(baseStats.defense, level),
    spAtk:   calcStat(baseStats.spAtk, level),
    spDef:   calcStat(baseStats.spDef, level),
    speed:   calcStat(baseStats.speed, level),
    maxHp:   calcHp(baseStats.hp, level),
  };
}

// ── EXP / levelling ───────────────────────────────────────────────────────────
// Spec §7.3: Medium Fast curve — total EXP to reach level N = N³
//            EXP gained = (baseExp × enemyLevel) ÷ 7

/** Total EXP required to reach exactly this level (not accumulated). */
export function expToLevel(level: number): number {
  return level ** 3;
}

/** EXP awarded to one participant after defeating an enemy. */
export function expGained(baseExp: number, enemyLevel: number): number {
  return Math.floor((baseExp * enemyLevel) / 7);
}

/** Derive current level from total accumulated EXP. */
export function levelFromExp(totalExp: number): number {
  return Math.max(1, Math.floor(Math.cbrt(totalExp)));
}

/**
 * EXP remaining until the next level-up.
 * Returns 0 if the Pokémon is exactly at a level boundary.
 */
export function expToNextLevel(totalExp: number): number {
  const currentLevel = levelFromExp(totalExp);
  const nextLevel = currentLevel + 1;
  return expToLevel(nextLevel) - totalExp;
}

// ── Damage formula ────────────────────────────────────────────────────────────
// Spec §4.2 (extended with attacker level):
//   Damage = (MovePower + ItemBonus) × Atk ÷ Def × TypeMultiplier × STAB × Level ÷ 50
//
// ItemBonus = 0 when itemSystemActive is false (caller responsibility).
// STAB = 1.5 if attacker's type matches move type, else 1.
// TypeMultiplier: 2 (super effective), 1 (neutral), 0.5 (not very effective), 0 (immune).
// Level = the attacking Pokémon's level — higher-level attackers hit harder.
// CritMultiplier = 1.5 on a Critical Hit (Focus Meter full). Spec §4.4.
// AccuracyMultiplier: 1.0 (correct answer) or partialCreditMultiplier (wrong/expired). Spec §3.3.

export interface DamageParams {
  movePower: number;
  itemBonus: number;
  attackerAtk: number;
  defenderDef: number;
  /** The attacking Pokémon's level — scales damage linearly. */
  attackerLevel: number;
  typeMultiplier: 0 | 0.5 | 1 | 2;
  stabMultiplier: 1 | 1.5;
  /** 1 = normal hit, 2 = charged/critical hit (Focus Meter full). Spec §4.4. */
  critMultiplier: 1 | 1.5 | 2;
  /** 1.0 = correct, 0.80/0.75/0.65 = partial credit per difficulty. Spec §3.3. */
  accuracyMultiplier: number;
}

/**
 * Calculate final damage dealt. Always returns at least 1 so no attack
 * produces a zero outcome (spec §3.3).
 */
export function calcDamage(p: DamageParams): number {
  const raw =
    (p.movePower + p.itemBonus) *
    (p.attackerAtk / p.defenderDef) *
    p.typeMultiplier *
    p.stabMultiplier *
    p.attackerLevel *
    p.critMultiplier /
    50;

  return Math.max(1, Math.floor(raw * p.accuracyMultiplier));
}

// ── Item slots ────────────────────────────────────────────────────────────────
// Spec §5.6: Slot unlocks are per individual Pokémon, not global.
//   Slot 1 → level 20  (also triggers global itemSystemActive if first)
//   Slot 2 → level 36
//   Slot 3 → level 50

export function itemSlotCount(level: number): number {
  if (level >= 50) return 3;
  if (level >= 36) return 2;
  if (level >= 20) return 1;
  return 0;
}

// ── Battle timer ──────────────────────────────────────────────────────────────
// 8 seconds at level 1, scaling down to 4 seconds at level 40+.

/**
 * Returns the battle puzzle timer in seconds for a given opponent level.
 * Linear interpolation between 8s (level 1) and 4s (level 40).
 */
export function battleTimerSeconds(level: number): number {
  if (level >= 40) return 4;
  const t = (level - 1) / 39; // 0 at level 1, ~1 at level 40
  return Math.round(8 - t * 4);
}

// ── Catch rate ────────────────────────────────────────────────────────────────
// Spec §6.6 simplified: ball base rate modified by HP zone.

export type HpZone = 'green' | 'orange' | 'red';

/** Derive HP zone from current HP percentage. */
export function hpZone(hpPercent: number): HpZone {
  if (hpPercent < 25) return 'red';
  if (hpPercent < 50) return 'orange';
  return 'green';
}

const HP_ZONE_MULTIPLIER: Record<HpZone, number> = {
  green: 1,
  orange: 1.5,
  red: 2,
};

/**
 * Effective catch probability (0–1) combining ball tier and HP zone.
 * ballBaseRate: 0.4 (Poké Ball), 0.6 (Great Ball), 0.8 (Ultra Ball).
 */
export function catchProbability(
  speciesCatchRate: number,
  ballBaseRate: number,
  currentHpPercent: number,
): number {
  const zone = hpZone(currentHpPercent);
  const zoneMultiplier = HP_ZONE_MULTIPLIER[zone];
  // Normalise species catch rate (0–255) to 0–1
  const speciesRate = speciesCatchRate / 255;
  return Math.min(1, speciesRate * ballBaseRate * zoneMultiplier);
}

// ── Pokédollars loss on blackout ──────────────────────────────────────────────
// Spec §2.6: blackout causes loss of half current Pokédollars.

export function pokeDollarsAfterBlackout(current: number): number {
  return Math.floor(current / 2);
}
