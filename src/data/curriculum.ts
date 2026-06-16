/**
 * Math Rank ladder — the *educational* progression, fully decoupled from
 * Pokémon levels and opponent levels (spec §3).
 *
 * Battle puzzles are generated from the player's current `mathRank`, NOT the
 * opponent's level, so reaching Pokémon Lv 100 never forces harder maths on a
 * child who hasn't mastered the current skill. Ranks only climb (never demote)
 * and only when the player proves mastery over a moving window of recent
 * challenges. Lower-rank "review" challenges are interleaved to keep earlier
 * skills sharp but are excluded from the rank-up calculation.
 *
 * Tunables — change these to make progression looser/tighter:
 *   MATH_WINDOW_SIZE      how many recent current-rank challenges to score
 *   MATH_RANKUP_THRESHOLD fraction of that window that must be correct to rank up
 *   MATH_REVIEW_FRACTION  chance a given challenge is a lower-rank review instead
 */

import type { MathTopic } from '../types/math';

/** Rolling window of recent *current-rank* challenges scored for rank-up. */
export const MATH_WINDOW_SIZE = 100;

/** Correct fraction of a full window required to advance one rank. */
export const MATH_RANKUP_THRESHOLD = 0.8;

/** Probability a challenge is pulled from a random lower rank as review. */
export const MATH_REVIEW_FRACTION = 0.3;

export interface MathRankDef {
  /** Difficulty config fed to the puzzle generator (mathProblemGenerator). */
  genLevel: number;
  topic: MathTopic;
  /** Short, kid-friendly description of the skill at this rank. */
  label: string;
}

/**
 * The ordered ladder. Rank N is MATH_RANKS[N-1]. Currently covers the
 * implemented topics (addition, subtraction); extend as new topics land in the
 * generator. `genLevel` reuses the generator's existing difficulty steps.
 */
export const MATH_RANKS: readonly MathRankDef[] = [
  { genLevel: 1,  topic: 'addition',    label: 'Addition to 10' },
  { genLevel: 3,  topic: 'addition',    label: 'Addition to 20' },
  { genLevel: 4,  topic: 'addition',    label: 'Addition to 50' },
  { genLevel: 5,  topic: 'addition',    label: 'Harder addition to 50' },
  { genLevel: 6,  topic: 'addition',    label: 'Addition to 100' },
  { genLevel: 7,  topic: 'subtraction', label: 'Subtraction to 10' },
  { genLevel: 8,  topic: 'subtraction', label: 'Subtraction to 20' },
  { genLevel: 9,  topic: 'subtraction', label: 'Subtraction to 50' },
  { genLevel: 10, topic: 'subtraction', label: 'Subtraction with borrowing' },
  { genLevel: 11, topic: 'subtraction', label: 'Negative answers to 10' },
  { genLevel: 12, topic: 'subtraction', label: 'Negative answers to 20' },
  { genLevel: 13, topic: 'subtraction', label: 'Negative answers to 50' },
];

/** Highest rank with distinct generated content (ceiling for rank-ups). */
export const MAX_MATH_RANK = MATH_RANKS.length;

/** Clamp a rank into the valid 1..MAX range. */
export function clampMathRank(rank: number): number {
  return Math.max(1, Math.min(rank, MAX_MATH_RANK));
}

/** Short skill label for a rank (e.g. "Addition to 100"). */
export function mathRankLabel(rank: number): string {
  return MATH_RANKS[clampMathRank(rank) - 1].label;
}
