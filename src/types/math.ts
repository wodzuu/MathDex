// ── Curriculum ────────────────────────────────────────────────────────────────
// Difficulty scales with the opponent's level (not dungeon floors).

export type MathTopic =
  | 'addition'          // Lv 1–10  (combined with subtraction)
  | 'subtraction'       // Lv 1–10
  | 'multiplication'    // Lv 11–20
  | 'division'          // Lv 21–30
  | 'orderOfOperations' // Lv 31–40
  | 'fractions'         // Lv 41–50
  | 'percentages'       // Lv 51–60
  | 'algebra';          // Lv 61+

/** Maps an opponent level to the active MathTopic for that battle. */
export const LEVEL_TOPIC: ReadonlyArray<{ maxLevel: number; topic: MathTopic }> = [
  { maxLevel: 10,         topic: 'addition' },
  { maxLevel: 20,         topic: 'multiplication' },
  { maxLevel: 30,         topic: 'division' },
  { maxLevel: 40,         topic: 'orderOfOperations' },
  { maxLevel: 50,         topic: 'fractions' },
  { maxLevel: 60,         topic: 'percentages' },
  { maxLevel: Infinity,   topic: 'algebra' },
];

// ── Puzzle ────────────────────────────────────────────────────────────────────

/** Where this puzzle appears — affects timer and hint availability. */
export type PuzzleContext = 'battle' | 'identification';

/**
 * A single generated math puzzle.
 * Created at runtime by lib/mathProblemGenerator.ts.
 * Never persisted — always regenerated fresh.
 */
export interface MathPuzzle {
  /** Transient ID — Date.now() is sufficient. */
  id: number;
  /**
   * Human-readable equation shown to the player.
   * Always ends with " = ?". Example: "(80 + 8) × 2 = ?"
   */
  equation: string;
  answer: number;
  topic: MathTopic;
  /** Generator difficulty step this puzzle was built from (drives difficulty). */
  level: number;
  context: PuzzleContext;
  /**
   * True when this is an interleaved lower-rank *review* challenge (spec §3).
   * Marked with a ⭐ in the UI and excluded from the rank-up window.
   */
  isReview?: boolean;
  /**
   * Seconds before the puzzle auto-submits at partial credit.
   * null for identification puzzles (always untimed). Spec §5.4.
   * Battle timer: 8s at level 1, scaling to 4s at level 40+.
   */
  timeLimitSeconds: number | null;
  /**
   * Method hint for identification puzzles only. Explains the approach,
   * never gives the answer directly. Spec §5.5.
   * e.g. "Solve inside the brackets first, then divide the result."
   */
  hint?: string;
}
