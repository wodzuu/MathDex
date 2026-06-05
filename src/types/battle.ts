import type { CaughtPokemon } from './pokemon';
import type { Move } from './moves';
import type { MathPuzzle } from './math';

// ── Battle phases ─────────────────────────────────────────────────────────────

/**
 * State machine phases for a single battle encounter.
 *
 *   pre → action → move-select → math → resolving → enemy-attack → action …
 *   action → switch-select → (switch resolves, enemy attacks) → action
 *   action → item-select → (potion used, enemy attacks) → action
 *   action → ball-select → catch-attempt → (caught or failed) → action
 *   resolving → victory / fled / blacked-out
 *
 * Spec §4.1.
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
  pokemonUid: string;
  amount: number;
  didLevelUp: boolean;
  newLevel?: number;
}

// ── Battle state ──────────────────────────────────────────────────────────────

/**
 * Full runtime state for a single battle.
 * Owned by the battleStore (Zustand). Reset to null when the battle ends.
 *
 * The enemy is represented as a CaughtPokemon for symmetry — the same
 * damage formula and stat lookups apply to both sides.
 */
export interface BattleState {
  phase: BattlePhase;
  /** Wild Pokémon being fought. Generated fresh for each encounter. */
  enemy: CaughtPokemon;
  /**
   * Enemy HP as a percentage 0–100. Stored separately from enemy.currentHp
   * so the HP bar can animate smoothly without mutating the entity struct.
   */
  enemyHpPercent: number;
  /** UID of the player's currently active (Lead) Pokémon. */
  activePlayerPokemonUid: string;
  /**
   * UIDs of every player Pokémon that has been sent out this battle.
   * At battle end, all UIDs here receive the full EXP award. Spec §4.7.
   */
  participantUids: string[];
  /** Move chosen during 'move-select', kept while phase is 'math'. */
  selectedMove: Move | null;
  /** Active math puzzle while phase is 'math'. */
  currentPuzzle: MathPuzzle | null;
  /**
   * Number of consecutive correct answers (0–4 visible pips).
   * At 5 consecutive correct answers, next hit is a Critical Hit (×1.5).
   * Resets to 0 on any incorrect answer. Spec §4.4.
   */
  focusPips: number;
  /** Transient damage floaters rendered over the enemy sprite. */
  damageFloats: DamageFloat[];
  turnCount: number;
  /** Populated once phase reaches 'victory'. Shown on the victory screen. */
  expGains: ExpGain[];
}
