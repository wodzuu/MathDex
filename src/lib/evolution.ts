/**
 * Evolution helpers — level is the only trigger (spec §6.4).
 *
 * Used by both sides of the game:
 *   - the player's Pokémon evolve on level-up (gameStore.updatePokemon),
 *   - wild encounters are rendered at the stage their level has earned
 *     (encounterGenerator), so low levels yield base forms and level 100 yields
 *     only final forms.
 */

import { getSpecies } from '../data/species';
import { GEN1_SPECIES } from '../data/gen1';

// Reverse map: evolved-form id → its pre-evolution id. Lets us find base forms.
const PRE_EVO = new Map<string, string>();
for (const s of GEN1_SPECIES) {
  if (s.evolution) PRE_EVO.set(s.evolution.evolvesIntoId, s.id);
}

/** True if nothing evolves into this species (it's the start of its family). */
export function isBaseForm(speciesId: string): boolean {
  return !PRE_EVO.has(speciesId);
}

/** Every family's base form — one entry per evolution line (+ standalones). */
export const BASE_FORMS: readonly string[] = GEN1_SPECIES
  .filter((s) => isBaseForm(s.id))
  .map((s) => s.id);

/**
 * Walk a species forward applying every evolution whose `atLevel ≤ level`.
 * Returns the species id this Pokémon should be at the given level.
 */
export function speciesAtLevel(speciesId: string, level: number): string {
  let id = speciesId;
  let sp = getSpecies(id);
  while (sp?.evolution && level >= sp.evolution.atLevel) {
    id = sp.evolution.evolvesIntoId;
    sp = getSpecies(id);
  }
  return id;
}

/**
 * The level-appropriate form of every family — the wild-encounter pool at a
 * given level (one species per family: its current evolution stage).
 */
export function eligiblePoolAtLevel(level: number): string[] {
  return BASE_FORMS.map((base) => speciesAtLevel(base, level));
}
