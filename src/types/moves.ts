import type { PokeType } from './pokemon';

export type MoveCategory = 'physical' | 'special' | 'status';

/**
 * Static move definition — the blueprint for a battle move.
 * Lives in src/data/moves.ts. Never mutated at runtime.
 *
 * The actual math puzzle shown when this move is selected is generated at
 * runtime by lib/mathProblemGenerator.ts using (power, floor, gameState).
 * The move itself only stores the base mechanical values.
 */
export interface Move {
  id: string;        // e.g. 'thunderbolt'
  name: string;
  type: PokeType;
  category: MoveCategory;
  /**
   * Base power used in the damage formula.
   * 0 for status moves (which have no damage component).
   */
  power: number;
  /** Max PP for this move. */
  pp: number;
  /**
   * Hit accuracy 0–100. 100 = guaranteed hit.
   * In the simplified core all damaging moves always hit (floor 1–30).
   * Misses are introduced as an extension mechanic at floor 31+.
   */
  accuracy: number;
}
