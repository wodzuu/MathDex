/**
 * Generation I roster loader + deriver.
 *
 * The roster itself lives in `pokemon.json` — the single source of truth for
 * which Pokémon exist and their core attributes (dexNumber, name, types,
 * baseStats). This module reads that JSON and derives the gameplay fields:
 *   - PokemonSpecies entries (GEN1_SPECIES) consumed by data/species.ts
 *   - encounter-pool entries (GEN1_POOL) consumed by lib/encounterGenerator.ts
 *
 * Derived fields (rules applied to the JSON config):
 *   - rarity:     legendaries → Legendary; else by base-stat total
 *   - baseExp:    round(BST / 5)        (Bulbasaur 318 → 64, matching canon)
 *   - catchRate:  by rarity tier
 *   - learnset:   generated from the primary type (always includes a usable
 *                 damaging move + a neutral fallback). Moves all exist in moves.ts.
 *   - floor band: weaker/common Pokémon appear early, stronger/rarer ones deep.
 */

import type { PokemonSpecies, PokeType, PokemonRarity, LevelUpMove, BaseStats } from '../types/pokemon';
import rawPokemon from './pokemon.json';

/** One Pokémon's raw configuration as stored in pokemon.json. */
interface PokemonConfig {
  dexNumber: number;
  name: string;
  types: PokeType[];
  /** PokéAPI capture rate (3–255). Drives the rarity tier. */
  captureRate: number;
  /** True forces Legendary rarity regardless of capture rate. */
  isLegendary?: boolean;
  baseStats: BaseStats;
}

/** pokemon.json is the only source of which Pokémon exist + their core stats. */
const ROSTER = rawPokemon as PokemonConfig[];

// Damaging moves per type (weak → strong); all exist in data/moves.ts.
const TYPE_MOVESET: Partial<Record<PokeType, string[]>> = {
  Normal:   ['tackle', 'quick-attack', 'slash', 'body-slam'],
  Fire:     ['ember', 'fire-spin', 'flamethrower'],
  Water:    ['bubble', 'water-gun', 'hydro-pump'],
  Grass:    ['absorb', 'vine-whip', 'razor-leaf', 'solar-beam'],
  Electric: ['thundershock', 'thunderbolt', 'thunder'],
  Rock:     ['rock-throw', 'rock-slide'],
  Ground:   ['dig', 'earthquake'],
  Bug:      ['leech-life', 'pin-missile'],
  Poison:   ['acid', 'sludge'],
  Psychic:  ['confusion', 'psychic'],
  Fighting: ['karate-chop', 'submission'],
  Ghost:    ['lick', 'night-shade'],
  Ice:      ['aurora-beam', 'ice-beam'],
  Dragon:   ['dragon-rage', 'twister'],
};

function slugId(name: string): string {
  return name
    .replace('♀', '-f')
    .replace('♂', '-m')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function bstOf(s: BaseStats): number {
  return s.hp + s.attack + s.defense + s.spAtk + s.spDef + s.speed;
}

/**
 * Rarity from PokéAPI capture rate (is_legendary always wins):
 *   190–255 Common · 100–189 Uncommon · 45–99 Rare · 3–44 Epic
 */
function rarityFromCaptureRate(captureRate: number, isLegendary?: boolean): PokemonRarity {
  if (isLegendary)         return 'Legendary';
  if (captureRate >= 190)  return 'Common';
  if (captureRate >= 100)  return 'Uncommon';
  if (captureRate >= 45)   return 'Rare';
  return 'Epic';
}

/** A small type-appropriate learnset; always includes a usable attack + fallback. */
function genLearnset(types: PokeType[]): LevelUpMove[] {
  const tmoves = TYPE_MOVESET[types[0]] ?? ['tackle'];
  const ls: LevelUpMove[] = [
    { level: 1, moveId: tmoves[0] },
    { level: 1, moveId: 'growl' },
  ];
  // Neutral fallback so a low-level Pokémon always has a damaging move.
  if (tmoves[0] !== 'tackle') ls.push({ level: 1, moveId: 'tackle' });
  if (tmoves[1]) ls.push({ level: 12, moveId: tmoves[1] });
  if (tmoves[2]) ls.push({ level: 24, moveId: tmoves[2] });
  if (tmoves[3]) ls.push({ level: 36, moveId: tmoves[3] });
  return ls;
}

// ── Build PokemonSpecies entries ──────────────────────────────────────────────
export const GEN1_SPECIES: PokemonSpecies[] = ROSTER.map((p) => {
  const bst    = bstOf(p.baseStats);
  const rarity = rarityFromCaptureRate(p.captureRate, p.isLegendary);
  return {
    id:        slugId(p.name),
    dexNumber: p.dexNumber,
    name:      p.name,
    types:     p.types as PokemonSpecies['types'],
    baseStats: p.baseStats,
    baseExp:   Math.round(bst / 5),
    catchRate: p.captureRate,   // real PokéAPI capture rate
    rarity,
    learnset:  genLearnset(p.types),
    emoji:     '❓', // sprites are used for rendering; emoji is a legacy placeholder
  };
});

// ── Build encounter-pool entries ──────────────────────────────────────────────

export interface Gen1PoolEntry {
  speciesId: string;
  speciesName: string;
  dexNumber: number;
  type: PokeType;
  /** Opponent-level range this species can be encountered in. */
  minLevel: number;
  maxLevel: number;
  weight: number;
  rarity: PokemonRarity;
}

/** Level band + spawn weight derived from rarity so weak commons appear early. */
function poolBand(rarity: PokemonRarity): Pick<Gen1PoolEntry, 'minLevel' | 'maxLevel' | 'weight'> {
  switch (rarity) {
    case 'Legendary': return { minLevel: 40, maxLevel: 100, weight: 1 };
    case 'Epic':      return { minLevel: 25, maxLevel: 100, weight: 2 };
    case 'Rare':      return { minLevel: 12, maxLevel: 100, weight: 3 };
    case 'Uncommon':  return { minLevel: 6,  maxLevel: 100, weight: 5 };
    default:          return { minLevel: 1,  maxLevel: 100, weight: 8 };
  }
}

export const GEN1_POOL: Gen1PoolEntry[] = ROSTER.map((p) => {
  const rarity = rarityFromCaptureRate(p.captureRate, p.isLegendary);
  return {
    speciesId:   slugId(p.name),
    speciesName: p.name,
    dexNumber:   p.dexNumber,
    type:        p.types[0],
    rarity,
    ...poolBand(rarity),
  };
});
