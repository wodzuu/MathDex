/**
 * Wild-encounter generator (spec §6.2).
 *
 * There are no dungeon floors. Each encounter's level scales with the player's
 * strongest party Pokémon (partyHigh ±1). The species is then chosen in two
 * decoupled steps:
 *
 *   1. STAGE-GATE BY LEVEL — the eligible pool is each family's evolution stage
 *      at the encounter level (lib/evolution). So low levels yield base forms
 *      and level 100 yields only final forms. Because evolved forms sit in rarer
 *      tiers, average rarity rises with level on its own.
 *
 *   2. RARITY-WEIGHTED PICK within that pool, plus a PITY GUARANTEE that forces a
 *      Rare/Epic/Legendary after a drought — preserving the retired shuffle-bag's
 *      "you'll always meet rarer Pokémon on a schedule" promise.
 */

import type { EncounterData } from '../types/dungeon';
import type { PokemonRarity, PokemonSpecies } from '../types/pokemon';
import type { EncounterPity } from '../types/gameState';
import { getSpecies } from '../data/species';
import { eligiblePoolAtLevel } from './evolution';

// Relative selection weights — the retired bag's ratios, now applied to the
// level-eligible pool rather than the whole roster.
const RARITY_WEIGHT: Record<PokemonRarity, number> = {
  Common: 55, Uncommon: 27, Rare: 12, Epic: 5, Legendary: 1,
};

const RARITY_ORDER: PokemonRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const rank = (r: PokemonRarity) => RARITY_ORDER.indexOf(r);

/**
 * Pity thresholds: force a tier-or-better spawn once this many encounters pass
 * without one. Tunable — these are the "no droughts" guarantee.
 */
export const ENCOUNTER_PITY = { rare: 8, epic: 30, legendary: 200 } as const;

export const EMPTY_PITY: EncounterPity = { rare: 0, epic: 0, legendary: 0 };

/** Enemy level = max(1, partyHighestLevel ± 1). */
export function pickLevel(partyHighestLevel: number): number {
  return Math.max(1, partyHighestLevel + Math.floor(Math.random() * 3) - 1);
}

function weightedPick(pool: PokemonSpecies[]): PokemonSpecies {
  const total = pool.reduce((a, s) => a + RARITY_WEIGHT[s.rarity], 0);
  let r = Math.random() * total;
  for (const s of pool) {
    r -= RARITY_WEIGHT[s.rarity];
    if (r <= 0) return s;
  }
  return pool[pool.length - 1];
}

/**
 * Choose the species for one wild encounter at `level`, honouring the pity
 * guarantee. Pure: returns the chosen species + advanced pity counters for the
 * caller to persist.
 */
export function pickEncounterSpecies(
  level: number,
  pity: EncounterPity,
): { species: PokemonSpecies; pity: EncounterPity } {
  const pool = eligiblePoolAtLevel(level)
    .map(getSpecies)
    .filter((s): s is PokemonSpecies => !!s);

  // This encounter counts — advance every counter.
  const next: EncounterPity = {
    rare:      pity.rare + 1,
    epic:      pity.epic + 1,
    legendary: pity.legendary + 1,
  };

  // Is a tier owed? Highest tier wins.
  let floor: PokemonRarity | null = null;
  if (next.legendary >= ENCOUNTER_PITY.legendary) floor = 'Legendary';
  else if (next.epic  >= ENCOUNTER_PITY.epic)     floor = 'Epic';
  else if (next.rare  >= ENCOUNTER_PITY.rare)     floor = 'Rare';

  let chosen: PokemonSpecies;
  if (floor) {
    const sub = pool.filter((s) => rank(s.rarity) >= rank(floor!));
    chosen = sub.length ? weightedPick(sub) : weightedPick(pool);
  } else {
    chosen = weightedPick(pool);
  }

  // Reset counters for every tier this spawn satisfied.
  const cr = rank(chosen.rarity);
  if (cr >= rank('Rare'))      next.rare = 0;
  if (cr >= rank('Epic'))      next.epic = 0;
  if (cr >= rank('Legendary')) next.legendary = 0;

  return { species: chosen, pity: next };
}

/** Build EncounterData for a chosen species rendered at a chosen level. */
export function buildEncounter(
  species: PokemonSpecies,
  level: number,
  itemSystemActive: boolean,
): EncounterData {
  return {
    id:          `enc-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    speciesId:   species.id,
    speciesName: species.name,
    dexNumber:   species.dexNumber,
    type:        species.types[0],
    level,
    rarity:      species.rarity,
    holdsItem:   itemSystemActive,
  };
}
