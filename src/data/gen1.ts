/**
 * Generation I roster loader + deriver.
 *
 * The roster itself lives in `pokemon.json` — the single source of truth for
 * which Pokémon exist and their core attributes (dexNumber, name, types,
 * baseStats). This module reads that JSON and derives the gameplay fields:
 *   - PokemonSpecies entries (GEN1_SPECIES) consumed by data/species.ts
 *   - encounter-pool entries (GEN1_POOL) consumed by lib/floorGenerator.ts
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
  baseStats: BaseStats;
}

/** pokemon.json is the only source of which Pokémon exist + their core stats. */
const ROSTER = rawPokemon as PokemonConfig[];

const LEGENDARY_DEX = new Set([144, 145, 146, 150, 151]);

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

function rarityOf(dex: number, bst: number): PokemonRarity {
  if (LEGENDARY_DEX.has(dex)) return 'Legendary';
  if (bst >= 500) return 'Rare';
  if (bst >= 400) return 'Uncommon';
  return 'Common';
}

function catchRateOf(rarity: PokemonRarity): number {
  switch (rarity) {
    case 'Legendary': return 3;
    case 'Rare':      return 45;
    case 'Uncommon':  return 120;
    default:          return 200;
  }
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
  const rarity = rarityOf(p.dexNumber, bst);
  return {
    id:        slugId(p.name),
    dexNumber: p.dexNumber,
    name:      p.name,
    types:     p.types as PokemonSpecies['types'],
    baseStats: p.baseStats,
    baseExp:   Math.round(bst / 5),
    catchRate: catchRateOf(rarity),
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
  minFloor: number;
  maxFloor: number;
  weight: number;
  rarity: PokemonRarity;
  isBossCandidate: boolean;
}

/** Floor band + spawn weight derived from rarity so weak commons appear early. */
function poolBand(rarity: PokemonRarity, bst: number): Pick<Gen1PoolEntry, 'minFloor' | 'maxFloor' | 'weight' | 'isBossCandidate'> {
  switch (rarity) {
    case 'Legendary': return { minFloor: 40, maxFloor: 65, weight: 1, isBossCandidate: true };
    case 'Rare':      return { minFloor: 18, maxFloor: 65, weight: 3, isBossCandidate: true };
    case 'Uncommon':  return { minFloor: 6,  maxFloor: 45, weight: 5, isBossCandidate: bst >= 450 };
    default:          return { minFloor: 1,  maxFloor: 30, weight: 8, isBossCandidate: false };
  }
}

export const GEN1_POOL: Gen1PoolEntry[] = ROSTER.map((p) => {
  const bst    = bstOf(p.baseStats);
  const rarity = rarityOf(p.dexNumber, bst);
  return {
    speciesId:   slugId(p.name),
    speciesName: p.name,
    dexNumber:   p.dexNumber,
    type:        p.types[0],
    rarity,
    ...poolBand(rarity, bst),
  };
});
