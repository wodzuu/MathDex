// ── Curriculum ────────────────────────────────────────────────────────────────
// Floor-to-topic mapping from spec §3.1.

export type MathTopic =
  | 'addition'          // Floors 1–10  (combined with subtraction)
  | 'subtraction'       // Floors 1–10
  | 'multiplication'    // Floors 11–20 (unlocked by floor 10 boss)
  | 'division'          // Floors 21–30 (unlocked by floor 20 boss)
  | 'orderOfOperations' // Floors 31–40 (unlocked by floor 30 boss)
  | 'fractions'         // Floors 41–50 (unlocked by floor 40 boss)
  | 'percentages'       // Floors 51–60 (unlocked by floor 50 boss)
  | 'algebra';          // Floors 61+   (unlocked by floor 60 boss)

/** Maps a floor number to the active MathTopic for that floor. Spec §3.1. */
export const FLOOR_TOPIC: ReadonlyArray<{ maxFloor: number; topic: MathTopic }> = [
  { maxFloor: 10,         topic: 'addition' },
  { maxFloor: 20,         topic: 'multiplication' },
  { maxFloor: 30,         topic: 'division' },
  { maxFloor: 40,         topic: 'orderOfOperations' },
  { maxFloor: 50,         topic: 'fractions' },
  { maxFloor: 60,         topic: 'percentages' },
  { maxFloor: Infinity,   topic: 'algebra' },
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
  floor: number;
  context: PuzzleContext;
  /**
   * Seconds before the puzzle auto-submits at partial credit.
   * null for identification puzzles (always untimed). Spec §5.4.
   * Battle timer: 8s at floor 1, scaling to 4s at floor 40+. Spec §4.3.
   */
  timeLimitSeconds: number | null;
  /**
   * Method hint for identification puzzles only. Explains the approach,
   * never gives the answer directly. Spec §5.5.
   * e.g. "Solve inside the brackets first, then divide the result."
   */
  hint?: string;
}
