// Battle-related shared types.
//
// NOTE: The full `BattleState` shape lives inline in `src/store/battleStore.ts`
// (the single source of truth). This file only exports the small supporting
// types that both the store and screens reference.

// ── Battle phases ─────────────────────────────────────────────────────────────

/**
 * State machine phases for a single battle encounter. Spec §4.1.
 */
export type BattlePhase =
  | 'pre'           // "Wild X appeared!" — choose Fight or Flee
  | 'action'        // Choose: Fight / Ball / Item / Flee / Switch
  | 'move-select'   // Choosing which of 4 moves to use
  | 'math'          // Math puzzle is on screen, timer running
  | 'resolving'     // Damage animation playing out
  | 'enemy-attack'  // Enemy move resolving (wild Pokémon attacks back)
  | 'switch-select' // Party panel open to choose incoming Pokémon
  | 'ball-select'   // Choosing which Poké Ball tier to throw
  | 'item-select'   // Choosing which Potion to use
  | 'catch-attempt' // Ball thrown — catch result calculating
  | 'victory'       // Battle won — EXP/loot screen showing
  | 'fled'          // Player fled successfully — no rewards
  | 'blacked-out';  // All party Pokémon fainted — return to town, lose half ₽

// ── Supporting types ──────────────────────────────────────────────────────────

/** Animated damage number floating above the enemy sprite. */
export interface DamageFloat {
  /** Date.now() at creation — used as React key. */
  id: number;
  amount: number;
  /** true = full power (correct answer), false = partial power (wrong/expired). */
  correct: boolean;
}

/**
 * EXP awarded to a single Pokémon at the end of a battle.
 * Only Pokémon that were actually sent out receive any. Spec §4.7.
 */
export interface ExpGain {
  instanceId: string;
  amount: number;
  didLevelUp: boolean;
  newLevel?: number;
}
