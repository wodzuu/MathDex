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
import type { PokemonSpecies, SpeciesEvolution } from '../types/pokemon';

/** Every evolution a species can take (1 for linear families, N for branches). */
export function evolutionsOf(sp: PokemonSpecies | undefined): SpeciesEvolution[] {
  if (!sp) return [];
  if (sp.evolutions?.length) return sp.evolutions;
  return sp.evolution ? [sp.evolution] : [];
}

// Reverse map: evolved-form id → its pre-evolution id. Lets us find base forms.
// Branch targets (e.g. Vaporeon/Jolteon/Flareon) all point back to Eevee.
const PRE_EVO = new Map<string, string>();
for (const s of GEN1_SPECIES) {
  for (const e of evolutionsOf(s)) PRE_EVO.set(e.evolvesIntoId, s.id);
}

/** True if nothing evolves into this species (it's the start of its family). */
export function isBaseForm(speciesId: string): boolean {
  return !PRE_EVO.has(speciesId);
}

/** The species this one evolves from, or undefined for a base form. */
export function preEvolutionOf(speciesId: string): string | undefined {
  return PRE_EVO.get(speciesId);
}

/** Walk back to the start of this species' evolution family. */
export function baseFormOf(speciesId: string): string {
  let id = speciesId;
  const seen = new Set([id]);
  for (let prev = PRE_EVO.get(id); prev && !seen.has(prev); prev = PRE_EVO.get(id)) {
    id = prev;
    seen.add(id);
  }
  return id;
}

/** A node in an evolution family tree. `level` is the level it evolves AT (the
 *  child's threshold); the root's level is undefined. */
export interface EvoNode { id: string; level?: number; children: EvoNode[]; }

/** Build the whole evolution family tree starting from `rootId`. */
export function evolutionTreeFrom(rootId: string): EvoNode {
  const build = (id: string, level: number | undefined, seen: Set<string>): EvoNode => {
    seen.add(id);
    const sp = getSpecies(id);
    const children = sp
      ? evolutionsOf(sp).filter((e) => !seen.has(e.evolvesIntoId)).map((e) => build(e.evolvesIntoId, e.atLevel, seen))
      : [];
    return { id, level, children };
  };
  return build(rootId, undefined, new Set());
}

/** Every family's base form — one entry per evolution line (+ standalones). */
export const BASE_FORMS: readonly string[] = GEN1_SPECIES
  .filter((s) => isBaseForm(s.id))
  .map((s) => s.id);

/**
 * Walk a species forward applying every evolution whose `atLevel ≤ level`.
 * Deterministic — branches resolve to their first form so wild-encounter pools
 * stay stable. For the player's (randomised) level-up evolution use
 * `evolveOnLevelUp`. Returns the species id this Pokémon is at the given level.
 */
export function speciesAtLevel(speciesId: string, level: number): string {
  let id = speciesId;
  let sp = getSpecies(id);
  for (let evos = evolutionsOf(sp); evos.length && level >= evos[0].atLevel; evos = evolutionsOf(sp)) {
    id = evos[0].evolvesIntoId;
    sp = getSpecies(id);
  }
  return id;
}

/**
 * The species id a player's Pokémon should become at the given level. Identical
 * to `speciesAtLevel` for linear families, but at a branch (Eevee) it picks a
 * RANDOM eligible form. Called once when a level threshold is crossed
 * (gameStore.updatePokemon) and the result is persisted, so the roll is final.
 */
export function evolveOnLevelUp(speciesId: string, level: number): string {
  let id = speciesId;
  let sp = getSpecies(id);
  for (let evos = evolutionsOf(sp); ; evos = evolutionsOf(sp)) {
    const eligible = evos.filter((e) => level >= e.atLevel);
    if (!eligible.length) break;
    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    id = pick.evolvesIntoId;
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
