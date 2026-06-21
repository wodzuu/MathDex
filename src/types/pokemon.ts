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
export type PokemonRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

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
   * Branching evolution — more than one possible evolved form (e.g. Eevee).
   * When present it supersedes `evolution`; the player's Pokémon evolves into a
   * random one of these on reaching the level. Absent for single-path families.
   */
  evolutions?: SpeciesEvolution[];
  /**
   * Moves learned by level-up. When a 5th move would be learned the player
   * chooses which existing move to forget. Spec §6.3.
   */
  learnset: LevelUpMove[];
  /** Single emoji used for early UI rendering (mirrors reference mockups). */
  emoji: string;
}

// ── Owned-Pokémon instance ────────────────────────────────────────────────────
// The runtime instance type a player owns now lives in `src/types/gameState.ts`
// as `OwnedPokemon`. This file holds only static species data + the type system.
