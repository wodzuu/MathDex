import type { CaughtPokemon } from './pokemon';
import type { BagItem } from './items';
import type { FloorBlock } from './dungeon';
import type { TrainerCard, DifficultyMode } from './player';

/**
 * Consumable inventory (Potions + Balls).
 * Purchased at the Mart only — never dropped in the dungeon. Spec §5.7.
 */
export interface Consumables {
  potion: number;       // +20 HP, ₽300
  superPotion: number;  // +60 HP, ₽700
  hyperPotion: number;  // +120 HP, ₽1200
  pokeBall: number;     // 40% base catch rate, ₽200
  greatBall: number;    // 60% base catch rate, ₽600
  ultraBall: number;    // 80% base catch rate, ₽1200
}

/**
 * Complete save state for a single player.
 * Serialised to Dexie (table: `save`, id=1) on every room transition
 * and on returning to town. Spec §11.4.
 *
 * The pokemon and bag arrays are denormalized here for fast access. The
 * Dexie `pokemon` and `bag` tables are the indexed source of truth for
 * queries; this top-level save record is the authoritative snapshot.
 */
export interface SaveState {
  /** Schema version — increment when migration is needed. */
  version: number;

  /**
   * THE central item-system gate. Set to true the moment any Pokémon in the
   * party reaches level 20. Never resets to false. Spec §5.0 and §11.2.
   *
   * When false: item slots, drops, identification screen, equip screen, and
   * Prof. Oak's lab must be completely invisible — no placeholders. Spec §8.
   */
  itemSystemActive: boolean;

  /**
   * Active party — ordered by CaughtPokemon.partySlot.
   * party[0] is always the Lead (currently active in battle).
   * Max 2–6 Pokémon depending on boss floor progress. Spec §6.5.
   */
  party: CaughtPokemon[];

  /**
   * PC Box — unlimited capacity. Pokémon here earn no EXP or EVs. Spec §6.5.
   */
  pcBox: CaughtPokemon[];

  /**
   * All items in the player's bag (identified and unidentified held items).
   * Consumables are tracked separately in `consumables`. Spec §5.1.
   */
  bag: BagItem[];

  pokeDollars: number;
  consumables: Consumables;

  /**
   * The floor number the player is currently exploring (or last entered).
   * Persisted so the player returns to the same floor on next launch.
   * Defaults to 1 for a new game. Updated when entering or descending in
   * the dungeon. Spec §11.4.
   */
  currentFloor: number;

  /**
   * One FloorBlock per 5-floor range. Blocks are unlocked sequentially by
   * clearing boss rooms. Spec §2.3.
   */
  floorBlocks: FloorBlock[];

  highestFloorReached: number;

  /**
   * Flags for curriculum extensions and optional mechanic unlocks.
   * Keys match mechanic names from the extensibility map. Spec §9.1.
   * e.g. { multiplicationTier: true, dualTypeStacking: false }
   */
  extensionFlags: Record<string, boolean>;

  trainerCard: TrainerCard;
  difficulty: DifficultyMode;

  /** ISO 8601 timestamp of the last successful autosave. */
  savedAt: string;
}

/** Default consumable counts for a new game. */
export const DEFAULT_CONSUMABLES: Consumables = {
  potion: 3,
  superPotion: 0,
  hyperPotion: 0,
  pokeBall: 5,
  greatBall: 0,
  ultraBall: 0,
};
