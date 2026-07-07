import type { PokeType, PokemonRarity } from './pokemon';

// ── Encounter ──────────────────────────────────────────────────────────────────
// The dungeon is an infinite stream of single wild encounters (no floors/rooms).

/**
 * Difficulty tier of an encounter (absent = normal).
 *   strong — the risk/reward slot: +3–5 levels, Rare-or-better, ×2 rewards.
 *   alpha  — the periodic boss (every ~10 victories): +5 levels on top of
 *            power scaling, Epic-or-better, ×3 rewards, big red aura.
 */
export type EncounterTier = 'strong' | 'alpha';

export interface EncounterData {
  /** Unique id for this encounter instance — React key + slot identity. */
  id: string;
  speciesId: string;
  /** Denormalized for display without a data lookup. */
  speciesName: string;
  dexNumber: number;
  type: PokeType;
  level: number;
  rarity: PokemonRarity;
  /**
   * True once itemSystemActive — shows a bag icon on the encounter card.
   * Wild Pokémon carry items if and only if the player has item slots. Spec §2.2.
   */
  holdsItem: boolean;
  /** Difficulty tier — 'strong' / 'alpha'; absent for a normal encounter. */
  tier?: EncounterTier;
}
