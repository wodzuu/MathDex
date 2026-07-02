// ── Curriculum ────────────────────────────────────────────────────────────────
// Puzzle difficulty is driven by the player's Math Rank (data/curriculum.ts),
// decoupled from Pokémon/opponent levels. Spec §3.

/**
 * The operation family a puzzle belongs to. The first four are live content
 * (MATH_RANKS); the rest are the documented extension path. Used for per-topic
 * accuracy tracking in TrainerStats.
 */
export type MathTopic =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'orderOfOperations'
  | 'fractions'
  | 'percentages'
  | 'algebra';

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
