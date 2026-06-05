// ── Pokémon type system ───────────────────────────────────────────────────────
// Simplified core launches with 6 types. Full 18-type chart staged from floor 21+.
// See spec §6.2 and the extensibility map §9.1.

export type PokeType =
  | 'Fire'
  | 'Water'
  | 'Grass'
  | 'Electric'
  | 'Normal'
  | 'Rock'
  // Extended types — introduced floor by floor from §9.1
  | 'Ground'   // floor 21
  | 'Ghost'    // floor 31
  | 'Psychic'  // floor 31
  | 'Dragon'   // floor 41
  | 'Dark'     // floor 41
  | 'Steel'    // floor 41
  | 'Ice'      // floor 41
  | 'Fairy'    // floor 51
  | 'Bug'      // floor 51
  | 'Poison'   // floor 51
  | 'Flying'   // floor 61
  | 'Fighting'; // floor 61

// ── Stat system ───────────────────────────────────────────────────────────────
// IVs fixed at 15, EVs = 0, natures neutral in simplified core. Spec §6.1.

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

/** Keys of BaseStats — used for mapped types in items and tokens */
export type StatKey = keyof BaseStats;

// ── Species definition ────────────────────────────────────────────────────────

export interface LevelUpMove {
  level: number;
  moveId: string;
}

export interface SpeciesEvolution {
  /** Species ID of the evolved form */
  evolvesIntoId: string;
  /** Level at which evolution occurs (always level-based — no stones). Spec §6.4. */
  atLevel: number;
}

/**
 * Rarity tier of a wild Pokémon encounter.
 * Determines drop frequency and base EXP yield.
 */
export type PokemonRarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary';

/**
 * Static species definition — the blueprint for a type of Pokémon.
 * Lives in src/data/species.ts. Never mutated at runtime.
 */
export interface PokemonSpecies {
  id: string;           // e.g. 'pikachu'
  dexNumber: number;
  name: string;
  /** 1 or 2 types. Dual types appear from floor 31+. */
  types: [PokeType] | [PokeType, PokeType];
  baseStats: BaseStats;
  /**
   * Base EXP yield. Used in EXP formula: (baseExp × enemyLevel) ÷ 7.
   * Spec §7.3.
   */
  baseExp: number;
  /**
   * Base catch rate (0–255). Used in simplified catch probability.
   * Spec §6.6.
   */
  catchRate: number;
  rarity: PokemonRarity;
  /** Absent for Pokémon that do not evolve in the simplified core. */
  evolution?: SpeciesEvolution;
  /**
   * Moves learned by level-up. When a 5th move would be learned the player
   * chooses which existing move to forget. Spec §6.3.
   */
  learnset: LevelUpMove[];
  /** Single emoji used for early UI rendering (mirrors reference mockups). */
  emoji: string;
}

// ── Caught Pokémon instance ───────────────────────────────────────────────────

export interface LearnedMove {
  moveId: string;
  currentPp: number;
  maxPp: number;
}

/**
 * An individual Pokémon owned by the player — a runtime instance of a species.
 * Persisted to Dexie (table: `pokemon`).
 *
 * Computed values (maxHp, current stats) are recalculated via lib/formulas.ts
 * whenever level or held items change; they are NOT stored here to avoid stale
 * data. Derive them fresh from (speciesId → baseStats, level, heldItemUids).
 */
export interface CaughtPokemon {
  /** UUID — unique instance identifier */
  uid: string;
  speciesId: string;
  nickname?: string;
  level: number;
  /** Current HP as a raw value (not percentage). */
  currentHp: number;
  /** Total accumulated EXP points. Level is derived from this via levelFromExp(). */
  expPoints: number;
  /** Up to 4 learned moves in battle order. */
  moves: LearnedMove[];
  /**
   * UIDs of equipped BagItems, one per unlocked slot. null = empty slot.
   * Array length MUST equal itemSlotCount(level) from lib/formulas.ts.
   * Must be [] when itemSystemActive is false. Spec §5.6.
   */
  heldItemUids: (string | null)[];
  /**
   * True while this Pokémon has been sent out in the current battle session.
   * Reset to false after the battle ends. Drives XP participation rule. Spec §4.7.
   */
  participatedInBattle: boolean;
  /** false = Pokémon is in the PC Box and earns no EXP. */
  inParty: boolean;
  /**
   * 0-indexed position in the active party. 0 = Lead (currently in battle).
   * null if the Pokémon is in the PC Box.
   */
  partySlot: number | null;
}
