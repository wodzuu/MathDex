import type { PokeType, PokemonRarity } from './pokemon';
import type { ItemRarity } from './items';
import type { MathTopic } from './math';

// ── Room types ────────────────────────────────────────────────────────────────
// Spec §2.5

export type RoomType = 'encounter' | 'chest' | 'rest' | 'stairs' | 'boss';

export interface EncounterData {
  speciesId: string;
  /** Denormalized for display without a data lookup. */
  speciesName: string;
  dexNumber: number;
  type: PokeType;
  level: number;
  rarity: PokemonRarity;
  /**
   * True once itemSystemActive — shows bag icon on the encounter card.
   * Wild Pokémon carry items if and only if the player has item slots. Spec §2.2.
   */
  holdsItem: boolean;
}

// ── Room ──────────────────────────────────────────────────────────────────────

/**
 * A single tappable node on the floor path.
 *
 * Mandatory rooms are cleared in sequence before stairs become available.
 * Optional rooms can be skipped entirely. Spec §2.4 and §2.5.
 */
export interface Room {
  /** Stable within a floor, e.g. 'r1', 'r2'. */
  id: string;
  type: RoomType;
  /**
   * Mandatory rooms show a yellow "!" badge and must be cleared to progress.
   * Optional rooms have no badge — they offer more EXP and loot at HP cost.
   */
  mandatory: boolean;
  cleared: boolean;
  /** Present when type === 'encounter' or 'boss'. */
  encounter?: EncounterData;
  /**
   * Rarity of the mystery item inside this chest.
   * Present when type === 'chest'.
   */
  chestRarity?: ItemRarity;
}

// ── Floor ─────────────────────────────────────────────────────────────────────

/**
 * A single dungeon floor — one horizontal path of 3–5 rooms.
 *
 * Floors are generated procedurally following the curriculum map.
 * The player never sees contents of the next floor until descending.
 * Spec §2.4.
 */
export interface DungeonFloor {
  floorNumber: number;
  rooms: Room[];
  mathTopic: MathTopic;
  /** Boss floors occur every 5 floors (5, 10, 15, …). Spec §2.3. */
  isBossFloor: boolean;
  /** True once the player has stepped onto this floor in the current run. */
  revealed: boolean;
}

// ── Floor blocks ──────────────────────────────────────────────────────────────

/**
 * A block of 5 consecutive floors (e.g. 1–5, 6–10).
 * Unlocked by clearing the boss room of the previous block. Spec §2.3.
 */
export interface FloorBlock {
  /** First floor of this block: 1, 6, 11, … */
  startFloor: number;
  /** Last floor of this block: 5, 10, 15, … */
  endFloor: number;
  unlocked: boolean;
  /**
   * Human-readable description of what clearing this block's boss unlocks.
   * e.g. 'multiplicationTier', 'thirdPartySlot'.
   * Used for celebratory screens and Prof. Oak field notes.
   */
  bossReward?: string;
}

// ── Active dungeon run ────────────────────────────────────────────────────────

/**
 * Transient state for the current dungeon run.
 * Saved to Dexie on every room transition. Spec §11.4.
 */
export interface DungeonRunState {
  currentFloor: number;
  /**
   * Floor objects for the current run. Only the active floor has fully
   * populated rooms; future floors are stubs until the player descends.
   */
  floors: DungeonFloor[];
  /** Total floors fully cleared this run (all mandatory rooms done). */
  floorsCleared: number;
  /** True after all party Pokémon fainted — triggers return to town + ₽ loss. */
  blackedOut: boolean;
  /**
   * Pokédollars held at the start of this run.
   * On blackout the player loses half of their current ₽. Spec §2.6.
   */
  pokeDollarsAtRunStart: number;
}
