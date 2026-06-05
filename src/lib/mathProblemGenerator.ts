/**
 * Runtime math puzzle generator for battle encounters.
 *
 * Generates MathPuzzle objects whose equations match the curriculum tier for the
 * current floor (spec §3.1). The equation is a simplified representation of the
 * damage formula component introduced at that tier — the engine always applies the
 * full calcDamage() formula regardless of what the child sees.
 *
 * Curriculum:
 *   Floors  1–10:  addition          power + itemBonus = ?
 *   Floors 11–20:  multiplication    power × typeMultiplier = ?
 *   Floors 21–30:  division          (power × mult) ÷ divisor = ?
 *   Floors 31–40:  order of ops      (power + itemBonus) × mult = ?
 *   Floors 41+:    higher tiers (falls back to multiplication for now)
 *
 * Status moves (power = 0) always generate a simple addition problem.
 */

import type { MathPuzzle, MathTopic } from '../types/math';
import type { PokeType } from '../types/pokemon';
import { FLOOR_TOPIC } from '../types/math';
import { battleTimerSeconds } from './formulas';

// ── Simplified 6-type effectiveness chart (spec §6.2) ────────────────────────
// Only launch types have explicit entries; all other pairs default to ×1.

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
 * Dual types (floor 31+) will take the maximum of the two values.
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

function topicForFloor(floor: number): MathTopic {
  const entry = FLOOR_TOPIC.find((t) => floor <= t.maxFloor);
  return (entry ?? FLOOR_TOPIC[FLOOR_TOPIC.length - 1]).topic;
}

// Find the smallest divisor in [2,3,4,5,10] that divides dividend evenly.
// Falls back to 2 and adjusts the dividend if none divide cleanly.
function cleanDivision(dividend: number): { dividend: number; divisor: number; answer: number } {
  const candidates = [2, 3, 4, 5, 10];
  const divisor = candidates.find((d) => dividend % d === 0) ?? 2;
  // Round dividend down to nearest multiple of divisor so answer is always a whole number
  const adjusted = dividend - (dividend % divisor);
  return { dividend: Math.max(divisor, adjusted), divisor, answer: Math.max(1, adjusted / divisor) };
}

// Max sum for addition problems by floor tier.
function additionMaxSum(floor: number): number {
  if (floor <= 1) return 10;
  if (floor <= 2) return 20;
  return 100;
}

// Two random addends that sum to at most additionMaxSum(floor), both ≥ 1.
function additionProblem(floor: number, timeLimitSeconds: number): MathPuzzle {
  const max   = additionMaxSum(floor);
  const total = Math.floor(Math.random() * (max - 1)) + 2; // 2..max
  const a     = Math.floor(Math.random() * (total - 1)) + 1; // 1..total-1
  const b     = total - a;
  return {
    id: Date.now(),
    equation: `${a} + ${b} = ?`,
    answer: total,
    topic: 'addition',
    floor,
    context: 'battle',
    timeLimitSeconds,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a battle math puzzle for the given move and game context.
 *
 * @param move          The move the player selected.
 * @param floor         Current dungeon floor — determines curriculum tier.
 * @param defenderTypes The enemy Pokémon's type(s).
 * @param itemBonus     Attack item bonus (0 when item system is inactive). Spec §4.2.
 */
/** Minimal move shape required by the generator — avoids coupling to the full Move type. */
export interface MoveLike {
  type: PokeType;
  category: 'physical' | 'special' | 'status';
  power: number;
}

export function generateBattlePuzzle(
  move: MoveLike,
  floor: number,
  defenderTypes: readonly PokeType[],
  itemBonus: number,
): MathPuzzle {
  const timeLimitSeconds = battleTimerSeconds(floor);
  const topic = topicForFloor(floor);

  if (move.category === 'status' || move.power === 0) {
    return additionProblem(floor, timeLimitSeconds);
  }

  const power = move.power;
  const mult = effectiveMultiplier(move.type, defenderTypes);
  // Use ×1 when the move has no effect (immune) so the puzzle still makes sense.
  const displayMult = mult === 0 ? 1 : mult;

  switch (topic) {
    case 'addition':
    case 'subtraction': {
      return additionProblem(floor, timeLimitSeconds);
    }

    case 'multiplication': {
      if (displayMult === 0.5) {
        // Show ÷2 instead of ×0.5 — children find halving more natural. Spec §3.2.
        return {
          id: Date.now(),
          equation: `${power} ÷ 2 = ?`,
          answer: Math.floor(power / 2),
          topic: 'multiplication',
          floor,
          context: 'battle',
          timeLimitSeconds,
        };
      }
      return {
        id: Date.now(),
        equation: `${power} × ${displayMult} = ?`,
        answer: power * displayMult,
        topic: 'multiplication',
        floor,
        context: 'battle',
        timeLimitSeconds,
      };
    }

    case 'division': {
      const total = Math.round(power * displayMult);
      const { dividend, divisor, answer } = cleanDivision(total);
      return {
        id: Date.now(),
        equation: `${dividend} ÷ ${divisor} = ?`,
        answer,
        topic: 'division',
        floor,
        context: 'battle',
        timeLimitSeconds,
      };
    }

    case 'orderOfOperations': {
      return {
        id: Date.now(),
        equation: `(${power} + ${itemBonus}) × ${displayMult} = ?`,
        answer: (power + itemBonus) * displayMult,
        topic: 'orderOfOperations',
        floor,
        context: 'battle',
        timeLimitSeconds,
      };
    }

    default: {
      // Higher curriculum tiers — multiplication is a safe readable fallback for now.
      return {
        id: Date.now(),
        equation: `${power} × ${displayMult} = ?`,
        answer: power * displayMult,
        topic,
        floor,
        context: 'battle',
        timeLimitSeconds,
      };
    }
  }
}
