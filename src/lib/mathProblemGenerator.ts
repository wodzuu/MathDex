/**
 * Runtime math puzzle generator for battle encounters.
 *
 * Every battle challenge is an ADDITION problem whose difficulty scales with the
 * OPPONENT'S LEVEL (there are no dungeon floors). The engine always applies the
 * full calcDamage() formula regardless of what the child sees on screen.
 *
 * Curriculum (by opponent level):
 *   Lv 1:    addition, result up to 10
 *   Lv 2:    addition, result up to 14
 *   Lv 3:    addition, result between 10 and 20
 *   Lv 4:    addition, result up to 50, with one addend in 0–9
 *   Lv 5:    addition, result between 20 and 50
 *   Lv 6+:   addition, result between 40 and 100
 */

import type { MathPuzzle } from '../types/math';
import type { PokeType } from '../types/pokemon';
import { battleTimerSeconds } from './formulas';

// ── Simplified 6-type effectiveness chart (spec §6.2) ────────────────────────
// Only launch types have explicit entries; all other pairs default to ×1.
// Used by the battle screen for the matchup/super-effective display.

const TYPE_CHART: Partial<Record<PokeType, Partial<Record<PokeType, 0.5 | 2>>>> = {
  Fire:     { Grass: 2, Rock: 2, Water: 0.5, Fire: 0.5 },
  Water:    { Fire: 2, Rock: 2, Grass: 0.5, Water: 0.5 },
  Grass:    { Water: 2, Rock: 2, Fire: 0.5, Grass: 0.5 },
  Electric: { Water: 2, Grass: 0.5, Electric: 0.5 },
  Normal:   { Rock: 0.5 },
  Rock:     { Fire: 2 },
};

/** Type-effectiveness multiplier for a single attacker/defender type pair. */
export function getTypeMultiplier(moveType: PokeType, defenderType: PokeType): 0 | 0.5 | 1 | 2 {
  return (TYPE_CHART[moveType]?.[defenderType] ?? 1) as 0 | 0.5 | 1 | 2;
}

/**
 * Highest multiplier of a move against all of a defender's types.
 * For single-type defenders this is just getTypeMultiplier(moveType, defenderType).
 * Dual types take the maximum of the two values.
 */
export function effectiveMultiplier(
  moveType: PokeType,
  defenderTypes: readonly PokeType[],
): 0 | 0.5 | 1 | 2 {
  if (defenderTypes.length === 0) return 1;
  const values = defenderTypes.map((dt) => getTypeMultiplier(moveType, dt));
  return Math.max(...values) as 0 | 0.5 | 1 | 2;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Random integer in [min, max] inclusive. */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Two addends for an addition puzzle, following the per-opponent-level curriculum:
 *
 *   Lv 1:   result up to 10
 *   Lv 2:   result up to 14
 *   Lv 3:   result between 10 and 20
 *   Lv 4:   result up to 50, with one addend in 0–9
 *   Lv 5:   result between 20 and 50
 *   Lv 6+:  result between 40 and 100
 */
function additionOperands(level: number): { a: number; b: number } {
  // Level 4 is special: one addend is small (0–9), the other makes up the rest.
  if (level === 4) {
    const small = randInt(0, 9);
    const big   = randInt(1, 50 - small);   // total = big + small ≤ 50
    return { a: big, b: small };
  }

  // All other levels: pick a target total in the level's range, then split it.
  let total: number;
  if (level <= 1)      total = randInt(2, 10);
  else if (level === 2) total = randInt(2, 14);
  else if (level === 3) total = randInt(10, 20);
  else if (level === 5) total = randInt(20, 50);
  else                  total = randInt(40, 100);  // level 6+

  const a = randInt(1, total - 1);
  return { a, b: total - a };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a battle math puzzle for the given opponent level.
 *
 * @param level The opponent's level — determines the addition difficulty + timer.
 */
export function generateBattlePuzzle(level: number): MathPuzzle {
  const timeLimitSeconds = battleTimerSeconds(level);

  let { a, b } = additionOperands(level);
  if (Math.random() < 0.5) [a, b] = [b, a];   // vary which addend appears first

  return {
    id: Date.now(),
    equation: `${a} + ${b} = ?`,
    answer: a + b,
    topic: 'addition',
    level,
    context: 'battle',
    timeLimitSeconds,
  };
}
