/**
 * Static species definitions for the launch build.
 *
 * Simplified core launches with 6 types: Fire, Water, Grass, Electric, Normal, Rock.
 * Species are added here as the content pipeline grows; downstream code always
 * uses getSpecies() so additions never require screen-level changes.
 *
 * Base stats sourced from canonical Pokémon data and kept as-is — the game's
 * stat formula (spec §6.1) scales them to a given level at runtime.
 */

import type { PokemonSpecies } from '../types/pokemon';

// ── Launch roster ─────────────────────────────────────────────────────────────

const SPECIES_LIST: PokemonSpecies[] = [
  // ── Electric ──────────────────────────────────────────────────────────────
  {
    id: 'pikachu', dexNumber: 25, name: 'Pikachu', types: ['Electric'],
    baseStats: { hp: 35, attack: 55, defense: 40, spAtk: 50, spDef: 50, speed: 90 },
    baseExp: 112, catchRate: 190, rarity: 'Uncommon',
    evolution: { evolvesIntoId: 'raichu', atLevel: 36 },
    learnset: [
      { level: 1, moveId: 'thundershock' }, { level: 5, moveId: 'growl' },
      { level: 10, moveId: 'quick-attack' }, { level: 15, moveId: 'thunderwave' },
      { level: 21, moveId: 'thunderbolt' }, { level: 29, moveId: 'agility' },
      { level: 37, moveId: 'swift' },       { level: 43, moveId: 'thunder' },
    ],
    emoji: '⚡',
  },
  {
    id: 'raichu', dexNumber: 26, name: 'Raichu', types: ['Electric'],
    baseStats: { hp: 60, attack: 90, defense: 55, spAtk: 90, spDef: 80, speed: 110 },
    baseExp: 218, catchRate: 75, rarity: 'Uncommon',
    learnset: [
      { level: 1, moveId: 'thundershock' }, { level: 1, moveId: 'growl' },
      { level: 1, moveId: 'quick-attack' }, { level: 1, moveId: 'thunderwave' },
      { level: 29, moveId: 'agility' },     { level: 43, moveId: 'thunder' },
    ],
    emoji: '🌩️',
  },
  {
    id: 'magnemite', dexNumber: 81, name: 'Magnemite', types: ['Electric'],
    baseStats: { hp: 25, attack: 35, defense: 70, spAtk: 95, spDef: 55, speed: 45 },
    baseExp: 65, catchRate: 190, rarity: 'Common',
    evolution: { evolvesIntoId: 'magneton', atLevel: 30 },
    learnset: [
      { level: 1, moveId: 'tackle' },       { level: 5, moveId: 'thundershock' },
      { level: 11, moveId: 'sonicboom' },   { level: 15, moveId: 'thunderwave' },
      { level: 20, moveId: 'thunderbolt' }, { level: 30, moveId: 'swift' },
    ],
    emoji: '🔩',
  },

  // ── Fire ──────────────────────────────────────────────────────────────────
  {
    id: 'charmander', dexNumber: 4, name: 'Charmander', types: ['Fire'],
    baseStats: { hp: 39, attack: 52, defense: 43, spAtk: 60, spDef: 50, speed: 65 },
    baseExp: 62, catchRate: 45, rarity: 'Uncommon',
    evolution: { evolvesIntoId: 'charmeleon', atLevel: 16 },
    learnset: [
      { level: 1, moveId: 'scratch' },     { level: 1, moveId: 'growl' },
      { level: 9, moveId: 'ember' },       { level: 15, moveId: 'smokescreen' },
      { level: 22, moveId: 'rage' },       { level: 28, moveId: 'slash' },
      { level: 38, moveId: 'flamethrower' },
    ],
    emoji: '🦎',
  },
  {
    id: 'charmeleon', dexNumber: 5, name: 'Charmeleon', types: ['Fire'],
    baseStats: { hp: 58, attack: 64, defense: 58, spAtk: 80, spDef: 65, speed: 80 },
    baseExp: 142, catchRate: 45, rarity: 'Uncommon',
    evolution: { evolvesIntoId: 'charizard', atLevel: 36 },
    learnset: [
      { level: 1, moveId: 'scratch' },     { level: 1, moveId: 'growl' },
      { level: 9, moveId: 'ember' },       { level: 38, moveId: 'flamethrower' },
    ],
    emoji: '🔥',
  },
  {
    id: 'charizard', dexNumber: 6, name: 'Charizard', types: ['Fire'],
    baseStats: { hp: 78, attack: 84, defense: 78, spAtk: 109, spDef: 85, speed: 100 },
    baseExp: 240, catchRate: 45, rarity: 'Rare',
    learnset: [
      { level: 1, moveId: 'scratch' },       { level: 1, moveId: 'growl' },
      { level: 9, moveId: 'ember' },         { level: 38, moveId: 'flamethrower' },
      { level: 46, moveId: 'fire-spin' },
    ],
    emoji: '🐉',
  },
  {
    id: 'growlithe', dexNumber: 58, name: 'Growlithe', types: ['Fire'],
    baseStats: { hp: 55, attack: 70, defense: 45, spAtk: 70, spDef: 50, speed: 60 },
    baseExp: 91, catchRate: 190, rarity: 'Common',
    learnset: [
      { level: 1, moveId: 'bite' },        { level: 1, moveId: 'roar' },
      { level: 11, moveId: 'ember' },      { level: 18, moveId: 'leer' },
      { level: 28, moveId: 'takedown' },   { level: 35, moveId: 'flamethrower' },
    ],
    emoji: '🔥',
  },

  // ── Water ─────────────────────────────────────────────────────────────────
  {
    id: 'squirtle', dexNumber: 7, name: 'Squirtle', types: ['Water'],
    baseStats: { hp: 44, attack: 48, defense: 65, spAtk: 50, spDef: 64, speed: 43 },
    baseExp: 63, catchRate: 45, rarity: 'Uncommon',
    evolution: { evolvesIntoId: 'wartortle', atLevel: 16 },
    learnset: [
      { level: 1, moveId: 'tackle' },      { level: 1, moveId: 'tail-whip' },
      { level: 7, moveId: 'bubble' },      { level: 13, moveId: 'withdraw' },
      { level: 18, moveId: 'water-gun' },
    ],
    emoji: '🐢',
  },
  {
    id: 'wartortle', dexNumber: 8, name: 'Wartortle', types: ['Water'],
    baseStats: { hp: 59, attack: 63, defense: 80, spAtk: 65, spDef: 80, speed: 58 },
    baseExp: 142, catchRate: 45, rarity: 'Uncommon',
    evolution: { evolvesIntoId: 'vaporeon', atLevel: 36 }, // simplified: skips Blastoise
    learnset: [
      { level: 1, moveId: 'tackle' }, { level: 18, moveId: 'water-gun' },
    ],
    emoji: '💧',
  },
  {
    id: 'vaporeon', dexNumber: 134, name: 'Vaporeon', types: ['Water'],
    baseStats: { hp: 130, attack: 65, defense: 60, spAtk: 110, spDef: 95, speed: 65 },
    baseExp: 184, catchRate: 45, rarity: 'Rare',
    learnset: [
      { level: 1, moveId: 'tackle' },        { level: 1, moveId: 'tail-whip' },
      { level: 1, moveId: 'water-gun' },     { level: 29, moveId: 'quick-attack' },
      { level: 36, moveId: 'haze' },         { level: 42, moveId: 'mist' },
      { level: 44, moveId: 'hydro-pump' },
    ],
    emoji: '🌊',
  },
  {
    id: 'magikarp', dexNumber: 129, name: 'Magikarp', types: ['Water'],
    baseStats: { hp: 20, attack: 10, defense: 55, spAtk: 15, spDef: 20, speed: 80 },
    baseExp: 40, catchRate: 255, rarity: 'Common',
    evolution: { evolvesIntoId: 'gyarados', atLevel: 20 }, // most dramatic evolution in the game!
    learnset: [
      { level: 15, moveId: 'tackle' },
    ],
    emoji: '🐟',
  },
  {
    id: 'gyarados', dexNumber: 130, name: 'Gyarados', types: ['Water'],
    baseStats: { hp: 95, attack: 125, defense: 79, spAtk: 60, spDef: 100, speed: 81 },
    baseExp: 214, catchRate: 45, rarity: 'Rare',
    learnset: [
      { level: 1, moveId: 'bite' },    { level: 1, moveId: 'dragon-rage' },
      { level: 20, moveId: 'leer' },   { level: 25, moveId: 'twister' },
      { level: 32, moveId: 'hydro-pump' },
    ],
    emoji: '🐉',
  },

  // ── Grass ─────────────────────────────────────────────────────────────────
  {
    id: 'bulbasaur', dexNumber: 1, name: 'Bulbasaur', types: ['Grass'],
    baseStats: { hp: 45, attack: 49, defense: 49, spAtk: 65, spDef: 65, speed: 45 },
    baseExp: 64, catchRate: 45, rarity: 'Uncommon',
    evolution: { evolvesIntoId: 'ivysaur', atLevel: 16 },
    learnset: [
      { level: 1, moveId: 'tackle' },       { level: 1, moveId: 'growl' },
      { level: 7, moveId: 'leech-seed' },   { level: 13, moveId: 'vine-whip' },
      { level: 22, moveId: 'poison-powder' }, { level: 33, moveId: 'razor-leaf' },
    ],
    emoji: '🌿',
  },

  // ── Normal ────────────────────────────────────────────────────────────────
  {
    id: 'rattata', dexNumber: 19, name: 'Rattata', types: ['Normal'],
    baseStats: { hp: 30, attack: 56, defense: 35, spAtk: 25, spDef: 35, speed: 72 },
    baseExp: 57, catchRate: 255, rarity: 'Common',
    evolution: { evolvesIntoId: 'raticate', atLevel: 20 },
    learnset: [
      { level: 1, moveId: 'tackle' },    { level: 1, moveId: 'tail-whip' },
      { level: 7, moveId: 'quick-attack' }, { level: 14, moveId: 'hyper-fang' },
    ],
    emoji: '🐭',
  },
  {
    id: 'meowth', dexNumber: 52, name: 'Meowth', types: ['Normal'],
    baseStats: { hp: 40, attack: 45, defense: 35, spAtk: 40, spDef: 40, speed: 90 },
    baseExp: 69, catchRate: 255, rarity: 'Common',
    evolution: { evolvesIntoId: 'persian', atLevel: 28 },
    learnset: [
      { level: 1, moveId: 'scratch' },    { level: 1, moveId: 'growl' },
      { level: 10, moveId: 'bite' },      { level: 17, moveId: 'pay-day' },
      { level: 24, moveId: 'screech' },   { level: 31, moveId: 'fury-swipes' },
    ],
    emoji: '🐱',
  },

  // ── Rock ──────────────────────────────────────────────────────────────────
  {
    id: 'geodude', dexNumber: 74, name: 'Geodude', types: ['Rock'],
    baseStats: { hp: 40, attack: 80, defense: 100, spAtk: 30, spDef: 30, speed: 20 },
    baseExp: 73, catchRate: 255, rarity: 'Common',
    evolution: { evolvesIntoId: 'graveler', atLevel: 25 },
    learnset: [
      { level: 1, moveId: 'tackle' },      { level: 1, moveId: 'defense-curl' },
      { level: 11, moveId: 'rock-throw' }, { level: 16, moveId: 'self-destruct' },
      { level: 21, moveId: 'harden' },     { level: 26, moveId: 'earthquake' },
      { level: 31, moveId: 'explosion' },
    ],
    emoji: '🪨',
  },
  {
    id: 'onix', dexNumber: 95, name: 'Onix', types: ['Rock'],
    baseStats: { hp: 35, attack: 45, defense: 160, spAtk: 30, spDef: 45, speed: 70 },
    baseExp: 108, catchRate: 45, rarity: 'Uncommon',
    learnset: [
      { level: 1, moveId: 'tackle' },       { level: 1, moveId: 'screech' },
      { level: 15, moveId: 'bind' },        { level: 19, moveId: 'rock-throw' },
      { level: 28, moveId: 'rage' },        { level: 33, moveId: 'slam' },
    ],
    emoji: '🐍',
  },
  {
    id: 'graveler', dexNumber: 75, name: 'Graveler', types: ['Rock'],
    baseStats: { hp: 55, attack: 95, defense: 115, spAtk: 45, spDef: 45, speed: 35 },
    baseExp: 137, catchRate: 120, rarity: 'Uncommon',
    learnset: [
      { level: 1, moveId: 'tackle' }, { level: 1, moveId: 'defense-curl' },
      { level: 11, moveId: 'rock-throw' }, { level: 26, moveId: 'earthquake' },
    ],
    emoji: '🪨',
  },

  // ── Fire (additional) ──────────────────────────────────────────────────────
  {
    id: 'vulpix', dexNumber: 37, name: 'Vulpix', types: ['Fire'],
    baseStats: { hp: 38, attack: 41, defense: 40, spAtk: 50, spDef: 65, speed: 65 },
    baseExp: 60, catchRate: 190, rarity: 'Uncommon',
    evolution: { evolvesIntoId: 'ninetales', atLevel: 30 },
    learnset: [
      { level: 1, moveId: 'ember' },       { level: 1, moveId: 'tail-whip' },
      { level: 14, moveId: 'quick-attack' }, { level: 20, moveId: 'confuse-ray' },
      { level: 28, moveId: 'flamethrower' },
    ],
    emoji: '🦊',
  },
  {
    id: 'ninetales', dexNumber: 38, name: 'Ninetales', types: ['Fire'],
    baseStats: { hp: 73, attack: 76, defense: 75, spAtk: 81, spDef: 100, speed: 100 },
    baseExp: 178, catchRate: 75, rarity: 'Rare',
    learnset: [
      { level: 1, moveId: 'ember' }, { level: 1, moveId: 'quick-attack' },
      { level: 36, moveId: 'flamethrower' },
    ],
    emoji: '🦊',
  },

  // ── Water (additional) ─────────────────────────────────────────────────────
  {
    id: 'poliwag', dexNumber: 60, name: 'Poliwag', types: ['Water'],
    baseStats: { hp: 40, attack: 50, defense: 40, spAtk: 40, spDef: 40, speed: 90 },
    baseExp: 60, catchRate: 255, rarity: 'Common',
    evolution: { evolvesIntoId: 'poliwhirl', atLevel: 25 },
    learnset: [
      { level: 1, moveId: 'bubble' }, { level: 16, moveId: 'water-gun' },
      { level: 19, moveId: 'doubleslap' }, { level: 24, moveId: 'body-slam' },
    ],
    emoji: '🌀',
  },
  {
    id: 'poliwhirl', dexNumber: 61, name: 'Poliwhirl', types: ['Water'],
    baseStats: { hp: 65, attack: 65, defense: 65, spAtk: 50, spDef: 50, speed: 90 },
    baseExp: 135, catchRate: 120, rarity: 'Uncommon',
    learnset: [
      { level: 1, moveId: 'water-gun' }, { level: 16, moveId: 'doubleslap' },
      { level: 28, moveId: 'body-slam' }, { level: 36, moveId: 'hydro-pump' },
    ],
    emoji: '💧',
  },

  // ── Grass (additional) ─────────────────────────────────────────────────────
  {
    id: 'oddish', dexNumber: 43, name: 'Oddish', types: ['Grass'],
    baseStats: { hp: 45, attack: 50, defense: 55, spAtk: 75, spDef: 65, speed: 30 },
    baseExp: 64, catchRate: 255, rarity: 'Common',
    evolution: { evolvesIntoId: 'gloom', atLevel: 21 },
    learnset: [
      { level: 1, moveId: 'absorb' },      { level: 12, moveId: 'acid' },
      { level: 19, moveId: 'petal-dance' }, { level: 30, moveId: 'solar-beam' },
    ],
    emoji: '🌷',
  },

  // ── Electric (additional) ──────────────────────────────────────────────────
  {
    id: 'voltorb', dexNumber: 100, name: 'Voltorb', types: ['Electric'],
    baseStats: { hp: 40, attack: 30, defense: 50, spAtk: 55, spDef: 55, speed: 100 },
    baseExp: 66, catchRate: 190, rarity: 'Common',
    evolution: { evolvesIntoId: 'electrode', atLevel: 30 },
    learnset: [
      { level: 1, moveId: 'tackle' },       { level: 1, moveId: 'screech' },
      { level: 17, moveId: 'thundershock' }, { level: 22, moveId: 'swift' },
      { level: 29, moveId: 'thunderbolt' },
    ],
    emoji: '💣',
  },
  {
    id: 'electrode', dexNumber: 101, name: 'Electrode', types: ['Electric'],
    baseStats: { hp: 60, attack: 50, defense: 70, spAtk: 80, spDef: 80, speed: 140 },
    baseExp: 150, catchRate: 60, rarity: 'Uncommon',
    learnset: [
      { level: 1, moveId: 'thundershock' }, { level: 1, moveId: 'screech' },
      { level: 29, moveId: 'thunderbolt' }, { level: 40, moveId: 'thunder' },
    ],
    emoji: '⚡',
  },

  // ── Normal (additional) ────────────────────────────────────────────────────
  {
    id: 'clefairy', dexNumber: 35, name: 'Clefairy', types: ['Normal'],
    baseStats: { hp: 70, attack: 45, defense: 48, spAtk: 60, spDef: 65, speed: 35 },
    baseExp: 68, catchRate: 150, rarity: 'Uncommon',
    learnset: [
      { level: 1, moveId: 'pound' },     { level: 1, moveId: 'growl' },
      { level: 13, moveId: 'sing' },     { level: 18, moveId: 'doubleslap' },
      { level: 24, moveId: 'body-slam' }, { level: 31, moveId: 'metronome' },
    ],
    emoji: '⭐',
  },
  {
    id: 'jigglypuff', dexNumber: 39, name: 'Jigglypuff', types: ['Normal'],
    baseStats: { hp: 115, attack: 45, defense: 20, spAtk: 45, spDef: 25, speed: 20 },
    baseExp: 76, catchRate: 170, rarity: 'Common',
    evolution: { evolvesIntoId: 'wigglytuff', atLevel: 32 },
    learnset: [
      { level: 1, moveId: 'sing' },      { level: 9, moveId: 'pound' },
      { level: 14, moveId: 'disable' },  { level: 19, moveId: 'defense-curl' },
      { level: 29, moveId: 'doubleslap' },
    ],
    emoji: '🎵',
  },
  {
    id: 'eevee', dexNumber: 133, name: 'Eevee', types: ['Normal'],
    baseStats: { hp: 55, attack: 55, defense: 50, spAtk: 45, spDef: 65, speed: 55 },
    baseExp: 92, catchRate: 45, rarity: 'Rare',
    learnset: [
      { level: 1, moveId: 'tackle' },      { level: 1, moveId: 'tail-whip' },
      { level: 16, moveId: 'quick-attack' }, { level: 23, moveId: 'sand-attack' },
      { level: 30, moveId: 'growl' },
    ],
    emoji: '🦴',
  },
];

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
