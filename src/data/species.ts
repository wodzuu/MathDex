/**
 * Species lookup.
 *
 * The full Generation I roster (#1–151) is generated in data/gen1.ts and
 * exposed here through getSpecies(). Downstream code always uses getSpecies()
 * so the roster can grow without screen-level changes.
 */

import type { PokemonSpecies } from '../types/pokemon';
import { GEN1_SPECIES } from './gen1';

const SPECIES_LIST: PokemonSpecies[] = GEN1_SPECIES;

// ── Lookup ────────────────────────────────────────────────────────────────────

export const SPECIES_MAP = new Map<string, PokemonSpecies>(
  SPECIES_LIST.map((s) => [s.id, s]),
);

/**
 * Look up a species by its string ID.
 * Returns undefined for unknown IDs — callers must handle gracefully.
 */
export function getSpecies(id: string): PokemonSpecies | undefined {
  return SPECIES_MAP.get(id);
}
