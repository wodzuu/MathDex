/**
 * Wild-encounter generator.
 *
 * There are no dungeon floors — the dungeon is an infinite stream of single
 * encounters. Each encounter's level scales with the player's strongest party
 * Pokémon, and the species is drawn from the level-appropriate pool.
 */

import type { EncounterData } from '../types/dungeon';
import { GEN1_POOL, type Gen1PoolEntry } from '../data/gen1';

const POOL: Gen1PoolEntry[] = GEN1_POOL;

/**
 * Enemy level scales with the player's strongest Pokémon:
 *   level = max(1, partyHighestLevel + (0|1|2) - 1)   →   partyHighest ±1.
 */
function pickLevel(partyHighestLevel: number): number {
  return Math.max(1, partyHighestLevel + Math.floor(Math.random() * 3) - 1);
}

/** Weighted random species from the entries available at the given level. */
function pickFromPool(level: number): Gen1PoolEntry {
  const candidates = POOL.filter((e) => level >= e.minLevel && level <= e.maxLevel);
  const pool = candidates.length > 0 ? candidates : POOL.filter((e) => level >= e.minLevel);
  const finalPool = pool.length > 0 ? pool : POOL;

  const totalWeight = finalPool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const entry of finalPool) {
    r -= entry.weight;
    if (r <= 0) return entry;
  }
  return finalPool[finalPool.length - 1];
}

/** Roll a single wild encounter scaled to the player's strongest Pokémon. */
export function generateEncounter(partyHighestLevel: number, itemSystemActive: boolean): EncounterData {
  const level = pickLevel(partyHighestLevel);
  const entry = pickFromPool(level);
  return {
    speciesId:   entry.speciesId,
    speciesName: entry.speciesName,
    dexNumber:   entry.dexNumber,
    type:        entry.type,
    level,
    rarity:      entry.rarity,
    holdsItem:   itemSystemActive,
  };
}
