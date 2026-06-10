/**
 * Wild-encounter generator.
 *
 * There are no dungeon floors — the dungeon is an infinite stream of single
 * encounters. Each encounter's level scales with the player's strongest party
 * Pokémon. The rarity is decided by the shuffle-bag (spec §6.2, drawn in the
 * game store); this module then picks a species of that rarity uniformly and
 * renders it at the opponent's level. Rarity is independent of level — there are
 * no level bands.
 */

import type { EncounterData } from '../types/dungeon';
import type { PokemonRarity } from '../types/pokemon';
import { GEN1_POOL, type Gen1PoolEntry } from '../data/gen1';

/** Species grouped by rarity, so a draw of a rarity can pick one uniformly. */
const BY_RARITY: Record<PokemonRarity, Gen1PoolEntry[]> = GEN1_POOL.reduce(
  (acc, entry) => {
    (acc[entry.rarity] ??= []).push(entry);
    return acc;
  },
  {} as Record<PokemonRarity, Gen1PoolEntry[]>,
);

/**
 * Enemy level scales with the player's strongest Pokémon:
 *   level = max(1, partyHighestLevel + (0|1|2) - 1)   →   partyHighest ±1.
 */
function pickLevel(partyHighestLevel: number): number {
  return Math.max(1, partyHighestLevel + Math.floor(Math.random() * 3) - 1);
}

/** A uniformly-random species of the given rarity (falls back to any species). */
function pickSpecies(rarity: PokemonRarity): Gen1PoolEntry {
  const list = BY_RARITY[rarity];
  if (list && list.length > 0) return list[Math.floor(Math.random() * list.length)];
  return GEN1_POOL[Math.floor(Math.random() * GEN1_POOL.length)];
}

/**
 * Roll a single wild encounter.
 *
 * @param partyHighestLevel level of the player's strongest party Pokémon
 * @param itemSystemActive  whether wild Pokémon carry items
 * @param rarity            rarity drawn from the shuffle-bag (gameStore.drawEncounterRarity)
 */
export function generateEncounter(
  partyHighestLevel: number,
  itemSystemActive: boolean,
  rarity: PokemonRarity,
): EncounterData {
  const level = pickLevel(partyHighestLevel);
  const entry = pickSpecies(rarity);
  return {
    id:          `enc-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    speciesId:   entry.speciesId,
    speciesName: entry.speciesName,
    dexNumber:   entry.dexNumber,
    type:        entry.type,
    level,
    rarity:      entry.rarity,
    holdsItem:   itemSystemActive,
  };
}
