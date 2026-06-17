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

import type { PokemonSpecies, PokeType, PokemonRarity, LevelUpMove, BaseStats, SpeciesEvolution } from '../types/pokemon';
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
 * Gen 1 evolution chains, keyed by the evolving species' slug id.
 *
 * The game uses LEVEL as the only evolution trigger (spec §6.4 — no stones,
 * trades, or friendship). Levels marked "official" are the canonical game/anime
 * level-up values; the rest are ARTIFICIAL stand-ins for stone/trade/branching
 * evolutions that have no natural level, chosen to keep ordering and balance
 * (single-step stone evos ≈ 30–35; final stone/trade steps ≈ 34–38). Eevee
 * branches three ways in Gen 1 — we fix the level-only path to Vaporeon.
 */
const EVOLUTIONS: Record<string, SpeciesEvolution> = {
  // ── Three-stage families ──
  bulbasaur:  { evolvesIntoId: 'ivysaur',    atLevel: 16 }, // official
  ivysaur:    { evolvesIntoId: 'venusaur',   atLevel: 32 }, // official
  charmander: { evolvesIntoId: 'charmeleon', atLevel: 16 }, // official
  charmeleon: { evolvesIntoId: 'charizard',  atLevel: 36 }, // official
  squirtle:   { evolvesIntoId: 'wartortle',  atLevel: 16 }, // official
  wartortle:  { evolvesIntoId: 'blastoise',  atLevel: 36 }, // official
  caterpie:   { evolvesIntoId: 'metapod',    atLevel: 7  }, // official
  metapod:    { evolvesIntoId: 'butterfree', atLevel: 10 }, // official
  weedle:     { evolvesIntoId: 'kakuna',     atLevel: 7  }, // official
  kakuna:     { evolvesIntoId: 'beedrill',   atLevel: 10 }, // official
  pidgey:     { evolvesIntoId: 'pidgeotto',  atLevel: 18 }, // official
  pidgeotto:  { evolvesIntoId: 'pidgeot',    atLevel: 36 }, // official
  'nidoran-f':{ evolvesIntoId: 'nidorina',   atLevel: 16 }, // official
  nidorina:   { evolvesIntoId: 'nidoqueen',  atLevel: 34 }, // artificial (Moon Stone)
  'nidoran-m':{ evolvesIntoId: 'nidorino',   atLevel: 16 }, // official
  nidorino:   { evolvesIntoId: 'nidoking',   atLevel: 34 }, // artificial (Moon Stone)
  oddish:     { evolvesIntoId: 'gloom',      atLevel: 21 }, // official
  gloom:      { evolvesIntoId: 'vileplume',  atLevel: 36 }, // artificial (Leaf Stone)
  poliwag:    { evolvesIntoId: 'poliwhirl',  atLevel: 25 }, // official
  poliwhirl:  { evolvesIntoId: 'poliwrath',  atLevel: 37 }, // artificial (Water Stone)
  abra:       { evolvesIntoId: 'kadabra',    atLevel: 16 }, // official
  kadabra:    { evolvesIntoId: 'alakazam',   atLevel: 36 }, // artificial (Trade)
  machop:     { evolvesIntoId: 'machoke',    atLevel: 28 }, // official
  machoke:    { evolvesIntoId: 'machamp',    atLevel: 38 }, // artificial (Trade)
  bellsprout: { evolvesIntoId: 'weepinbell', atLevel: 21 }, // official
  weepinbell: { evolvesIntoId: 'victreebel', atLevel: 36 }, // artificial (Leaf Stone)
  geodude:    { evolvesIntoId: 'graveler',   atLevel: 25 }, // official
  graveler:   { evolvesIntoId: 'golem',      atLevel: 36 }, // artificial (Trade)
  gastly:     { evolvesIntoId: 'haunter',    atLevel: 25 }, // official
  haunter:    { evolvesIntoId: 'gengar',     atLevel: 38 }, // artificial (Trade)
  dratini:    { evolvesIntoId: 'dragonair',  atLevel: 30 }, // official
  dragonair:  { evolvesIntoId: 'dragonite',  atLevel: 55 }, // official

  // ── Two-stage families (official level-up) ──
  rattata:    { evolvesIntoId: 'raticate',   atLevel: 20 },
  spearow:    { evolvesIntoId: 'fearow',     atLevel: 20 },
  ekans:      { evolvesIntoId: 'arbok',      atLevel: 22 },
  sandshrew:  { evolvesIntoId: 'sandslash',  atLevel: 22 },
  zubat:      { evolvesIntoId: 'golbat',     atLevel: 22 },
  paras:      { evolvesIntoId: 'parasect',   atLevel: 24 },
  venonat:    { evolvesIntoId: 'venomoth',   atLevel: 31 },
  diglett:    { evolvesIntoId: 'dugtrio',    atLevel: 26 },
  meowth:     { evolvesIntoId: 'persian',    atLevel: 28 },
  psyduck:    { evolvesIntoId: 'golduck',    atLevel: 33 },
  mankey:     { evolvesIntoId: 'primeape',   atLevel: 28 },
  tentacool:  { evolvesIntoId: 'tentacruel', atLevel: 30 },
  ponyta:     { evolvesIntoId: 'rapidash',   atLevel: 40 },
  slowpoke:   { evolvesIntoId: 'slowbro',    atLevel: 37 },
  magnemite:  { evolvesIntoId: 'magneton',   atLevel: 30 },
  doduo:      { evolvesIntoId: 'dodrio',     atLevel: 31 },
  seel:       { evolvesIntoId: 'dewgong',    atLevel: 34 },
  grimer:     { evolvesIntoId: 'muk',        atLevel: 38 },
  drowzee:    { evolvesIntoId: 'hypno',      atLevel: 26 },
  krabby:     { evolvesIntoId: 'kingler',    atLevel: 28 },
  voltorb:    { evolvesIntoId: 'electrode',  atLevel: 30 },
  cubone:     { evolvesIntoId: 'marowak',    atLevel: 28 },
  koffing:    { evolvesIntoId: 'weezing',    atLevel: 35 },
  rhyhorn:    { evolvesIntoId: 'rhydon',     atLevel: 42 },
  horsea:     { evolvesIntoId: 'seadra',     atLevel: 32 },
  goldeen:    { evolvesIntoId: 'seaking',    atLevel: 33 },
  magikarp:   { evolvesIntoId: 'gyarados',   atLevel: 20 },
  omanyte:    { evolvesIntoId: 'omastar',    atLevel: 40 },
  kabuto:     { evolvesIntoId: 'kabutops',   atLevel: 40 },

  // ── Two-stage families (artificial — stone / branching) ──
  pikachu:    { evolvesIntoId: 'raichu',     atLevel: 30 }, // Thunder Stone
  vulpix:     { evolvesIntoId: 'ninetales',  atLevel: 32 }, // Fire Stone
  growlithe:  { evolvesIntoId: 'arcanine',   atLevel: 35 }, // Fire Stone
  clefairy:   { evolvesIntoId: 'clefable',   atLevel: 30 }, // Moon Stone
  jigglypuff: { evolvesIntoId: 'wigglytuff', atLevel: 30 }, // Moon Stone
  shellder:   { evolvesIntoId: 'cloyster',   atLevel: 32 }, // Water Stone
  staryu:     { evolvesIntoId: 'starmie',    atLevel: 32 }, // Water Stone
  exeggcute:  { evolvesIntoId: 'exeggutor',  atLevel: 32 }, // Leaf Stone
  eevee:      { evolvesIntoId: 'vaporeon',   atLevel: 30 }, // Water Stone (branch → Vaporeon)
};

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
    evolution: EVOLUTIONS[slugId(p.name)],
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
  rarity: PokemonRarity;
}

// Encounter rarity is chosen by the shuffle-bag (spec §6.2); within a rarity the
// species is picked uniformly and rendered at the opponent's level. There are no
// level bands or spawn weights — the pool is just every species tagged by rarity.
export const GEN1_POOL: Gen1PoolEntry[] = ROSTER.map((p) => ({
  speciesId:   slugId(p.name),
  speciesName: p.name,
  dexNumber:   p.dexNumber,
  type:        p.types[0],
  rarity:      rarityFromCaptureRate(p.captureRate, p.isLegendary),
}));
