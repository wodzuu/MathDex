/**
 * Runtime math puzzle generator for battle encounters.
 *
 * Puzzles are built from the player's MATH RANK (data/curriculum.ts), not the
 * opponent's level — each rank maps to a `genLevel` difficulty step handled by
 * the GEN config table below. The engine always applies the full calcDamage()
 * formula regardless of what the child sees on screen.
 *
 * The 20-step ladder covers addition, subtraction (incl. borrowing & negative
 * results), multiplication, and division — see GEN for the exact ranges.
 */

import type { MathPuzzle } from '../types/math';
import type { PokeType } from '../types/pokemon';
import { battleTimerSeconds } from './formulas';
import { MATH_RANKS, MATH_REVIEW_FRACTION, clampMathRank } from '../data/curriculum';

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

type Operands = { a: number; b: number };

/** Addition with a target sum in [min, max], split into two addends ≥ 1. */
function addSum(min: number, max: number): Operands {
  const total = randInt(min, max);
  const a = randInt(1, total - 1);
  return { a, b: total - a };
}

/** Addition where one addend is small (0–9) and the pair sums to ≤ max. */
function addSmallPlusBig(max: number): Operands {
  const small = randInt(0, 9);
  const big   = randInt(1, max - small);
  return { a: big, b: small };
}

/** Subtraction `a − b`, no negative result, operands up to max. */
function subNoNeg(max: number): Operands {
  const a = randInt(1, max);
  return { a, b: randInt(1, a) };
}

/** Subtraction up to 50, no negative, NO borrowing (each digit of b ≤ a's). */
function subNoBorrow(): Operands {
  let a = 1, b = 1;
  for (let i = 0; i < 30; i++) {
    const ta = randInt(0, 4), ua = randInt(0, 9);
    const tb = randInt(0, ta), ub = randInt(0, ua);   // tens & units of b ≤ a's
    a = ta * 10 + ua; b = tb * 10 + ub;
    if (a >= 1 && b >= 1) break;
  }
  if (b < 1) b = a;   // fallback (still no borrow, result 0)
  return { a: Math.max(1, a), b: Math.max(1, b) };
}

/** Subtraction up to 50, no negative, borrowing REQUIRED (units of b > a's). */
function subBorrow(): Operands {
  const ta = randInt(1, 4), ua = randInt(0, 8);   // a = 10..48
  const ub = randInt(ua + 1, 9);                  // units of b strictly greater
  const tb = randInt(0, ta - 1);                  // fewer tens, so b < a overall
  return { a: ta * 10 + ua, b: tb * 10 + ub };
}

/** Subtraction with operands chosen independently in [1, max] → may be negative. */
function subAny(max: number): Operands {
  return { a: randInt(1, max), b: randInt(1, max) };
}

/** Multiplication `a × b` with both factors ≤ maxFactor and product ≤ maxProduct. */
function mul(maxProduct: number, maxFactor: number): Operands {
  const a    = randInt(1, maxFactor);
  const bMax = Math.max(1, Math.min(maxFactor, Math.floor(maxProduct / a)));
  return { a, b: randInt(1, bMax) };
}

/** Division `a ÷ b` with an integral result; dividend < maxDividend, divisor < maxDivisor. */
function div(maxDividend: number, maxDivisor: number): Operands {
  const b    = randInt(2, maxDivisor - 1);                  // divisor ≥ 2 (no ÷1)
  const maxQ = Math.max(1, Math.floor((maxDividend - 1) / b));
  const q    = randInt(maxQ >= 2 ? 2 : 1, maxQ);           // prefer a real quotient
  return { a: b * q, b };
}

/** Division "10×10 table": divisor and quotient both 1–10, remainder always 0. */
function divTable(): Operands {
  const b = randInt(1, 10);   // divisor
  const q = randInt(1, 10);   // quotient
  return { a: b * q, b };
}

// ── Difficulty configs ──────────────────────────────────────────────────────
// One entry per Math Rank genLevel (see data/curriculum.ts MATH_RANKS). `op`
// drives the symbol + answer; commutative ops (+ ×) may swap operand order.

type Op = '+' | '-' | '×' | '÷';
interface GenConfig { topic: MathPuzzle['topic']; op: Op; operands: () => Operands; }

const GEN: Record<number, GenConfig> = {
  1:  { topic: 'addition',       op: '+', operands: () => addSum(2, 10) },
  2:  { topic: 'addition',       op: '+', operands: () => addSum(10, 20) },
  3:  { topic: 'subtraction',    op: '-', operands: () => subNoNeg(10) },
  4:  { topic: 'addition',       op: '+', operands: () => addSmallPlusBig(50) },
  5:  { topic: 'subtraction',    op: '-', operands: () => subNoNeg(20) },
  6:  { topic: 'addition',       op: '+', operands: () => addSum(20, 50) },
  7:  { topic: 'addition',       op: '+', operands: () => addSum(40, 100) },
  8:  { topic: 'subtraction',    op: '-', operands: () => subNoBorrow() },
  9:  { topic: 'subtraction',    op: '-', operands: () => subBorrow() },
  10: { topic: 'subtraction',    op: '-', operands: () => subAny(10) },
  11: { topic: 'multiplication', op: '×', operands: () => mul(20, 10) },
  12: { topic: 'subtraction',    op: '-', operands: () => subAny(20) },
  13: { topic: 'multiplication', op: '×', operands: () => mul(50, 10) },
  14: { topic: 'subtraction',    op: '-', operands: () => subAny(50) },
  15: { topic: 'multiplication', op: '×', operands: () => mul(100, 10) },
  16: { topic: 'division',       op: '÷', operands: () => divTable() },
  17: { topic: 'division',       op: '÷', operands: () => div(24, 10) },
  18: { topic: 'multiplication', op: '×', operands: () => mul(100, 20) },
  19: { topic: 'division',       op: '÷', operands: () => div(48, 20) },
  20: { topic: 'multiplication', op: '×', operands: () => mul(100, 50) },
  21: { topic: 'division',       op: '÷', operands: () => div(100, 20) },
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a battle math puzzle for the given difficulty step (a Math Rank's
 * `genLevel`). The operation, number ranges, and timer all come from that step.
 */
export function generateBattlePuzzle(genLevel: number): MathPuzzle {
  const cfg = GEN[genLevel] ?? GEN[1];
  let { a, b } = cfg.operands();
  // Commutative operations: vary which operand appears first.
  if ((cfg.op === '+' || cfg.op === '×') && Math.random() < 0.5) [a, b] = [b, a];

  const answer = cfg.op === '+' ? a + b
               : cfg.op === '-' ? a - b
               : cfg.op === '×' ? a * b
               : a / b;

  return {
    id: Date.now(),
    equation: `${a} ${cfg.op} ${b} = ?`,
    answer,
    topic: cfg.topic,
    level: genLevel,
    context: 'battle',
    timeLimitSeconds: battleTimerSeconds(genLevel),
  };
}

/**
 * Generate a battle puzzle for the player's current MATH RANK (spec §3) — fully
 * decoupled from opponent level. With probability MATH_REVIEW_FRACTION (and only
 * above rank 1) the challenge is pulled from a uniformly-random LOWER rank as a
 * review; review puzzles are flagged `isReview` so the caller excludes them from
 * the rank-up window. Pass `allowReview = false` to force a current-rank puzzle
 * (e.g. catch attempts, which should never be drawn from a lower rank).
 */
export function generateRankedPuzzle(mathRank: number, allowReview = true): MathPuzzle {
  const rank      = clampMathRank(mathRank);
  const isReview  = allowReview && rank > 1 && Math.random() < MATH_REVIEW_FRACTION;
  const drawnRank = isReview ? randInt(1, rank - 1) : rank;
  const genLevel  = MATH_RANKS[drawnRank - 1].genLevel;
  return { ...generateBattlePuzzle(genLevel), isReview };
}
