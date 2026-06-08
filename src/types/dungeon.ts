import type { PokeType, PokemonRarity } from './pokemon';

// ── Encounter ──────────────────────────────────────────────────────────────────
// The dungeon is an infinite stream of single wild encounters (no floors/rooms).

export interface EncounterData {
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
}
