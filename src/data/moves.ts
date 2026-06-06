/**
 * Static move definitions for all moves referenced in species learnsets.
 *
 * Types follow the simplified 6-type launch core (Fire/Water/Grass/Electric/Normal/Rock)
 * for moves within that set, and use the correct extended type for others — the type
 * chart will return ×1 for any type pair not yet introduced at the current floor.
 *
 * Base values sourced from canonical Pokémon data. Power/PP match Gen I originals.
 * Call getMove(id) anywhere you need full move data from a LearnedMove.moveId.
 */

import type { Move } from '../types/moves';

const MOVES_LIST: Move[] = [
  // ── Electric ──────────────────────────────────────────────────────────────
  { id: 'thundershock', name: 'ThunderShock', type: 'Electric', category: 'special',  power: 40,  pp: 30, accuracy: 100 },
  { id: 'thunderbolt',  name: 'Thunderbolt',  type: 'Electric', category: 'special',  power: 90,  pp: 15, accuracy: 100 },
  { id: 'thunder',      name: 'Thunder',      type: 'Electric', category: 'special',  power: 110, pp: 10, accuracy: 70  },
  { id: 'thunderwave',  name: 'Thunder Wave', type: 'Electric', category: 'status',   power: 0,   pp: 20, accuracy: 100 },
  { id: 'agility',      name: 'Agility',      type: 'Psychic',  category: 'status',   power: 0,   pp: 30, accuracy: 100 },

  // ── Normal – physical ─────────────────────────────────────────────────────
  { id: 'tackle',       name: 'Tackle',       type: 'Normal',   category: 'physical', power: 40,  pp: 35, accuracy: 100 },
  { id: 'scratch',      name: 'Scratch',      type: 'Normal',   category: 'physical', power: 40,  pp: 35, accuracy: 100 },
  { id: 'quick-attack', name: 'Quick Attack', type: 'Normal',   category: 'physical', power: 40,  pp: 30, accuracy: 100 },
  { id: 'slash',        name: 'Slash',        type: 'Normal',   category: 'physical', power: 70,  pp: 20, accuracy: 100 },
  { id: 'bite',         name: 'Bite',         type: 'Normal',   category: 'physical', power: 60,  pp: 25, accuracy: 100 },
  { id: 'takedown',     name: 'Take Down',    type: 'Normal',   category: 'physical', power: 90,  pp: 20, accuracy: 85  },
  { id: 'slam',         name: 'Slam',         type: 'Normal',   category: 'physical', power: 80,  pp: 20, accuracy: 75  },
  { id: 'hyper-fang',   name: 'Hyper Fang',   type: 'Normal',   category: 'physical', power: 80,  pp: 15, accuracy: 90  },
  { id: 'rage',         name: 'Rage',         type: 'Normal',   category: 'physical', power: 20,  pp: 20, accuracy: 100 },
  { id: 'bind',         name: 'Bind',         type: 'Normal',   category: 'physical', power: 15,  pp: 20, accuracy: 85  },
  { id: 'doubleslap',   name: 'DoubleSlap',   type: 'Normal',   category: 'physical', power: 15,  pp: 10, accuracy: 85  },
  { id: 'body-slam',    name: 'Body Slam',    type: 'Normal',   category: 'physical', power: 85,  pp: 15, accuracy: 100 },
  { id: 'fury-swipes',  name: 'Fury Swipes',  type: 'Normal',   category: 'physical', power: 18,  pp: 15, accuracy: 80  },
  { id: 'pay-day',      name: 'Pay Day',      type: 'Normal',   category: 'physical', power: 40,  pp: 20, accuracy: 100 },
  { id: 'pound',        name: 'Pound',        type: 'Normal',   category: 'physical', power: 40,  pp: 35, accuracy: 100 },
  { id: 'self-destruct',name: 'Selfdestruct', type: 'Normal',   category: 'physical', power: 200, pp: 5,  accuracy: 100 },
  { id: 'explosion',    name: 'Explosion',    type: 'Normal',   category: 'physical', power: 250, pp: 5,  accuracy: 100 },

  // ── Normal – special ─────────────────────────────────────────────────────
  { id: 'sonicboom',    name: 'SonicBoom',    type: 'Normal',   category: 'special',  power: 20,  pp: 20, accuracy: 90  },
  { id: 'swift',        name: 'Swift',        type: 'Normal',   category: 'special',  power: 60,  pp: 20, accuracy: 100 },
  { id: 'dragon-rage',  name: 'Dragon Rage',  type: 'Dragon',   category: 'special',  power: 40,  pp: 10, accuracy: 100 },
  { id: 'twister',      name: 'Twister',      type: 'Dragon',   category: 'special',  power: 40,  pp: 20, accuracy: 100 },
  { id: 'acid',         name: 'Acid',         type: 'Poison',   category: 'special',  power: 40,  pp: 30, accuracy: 100 },

  // ── Normal – status ──────────────────────────────────────────────────────
  { id: 'growl',        name: 'Growl',        type: 'Normal',   category: 'status',   power: 0,   pp: 40, accuracy: 100 },
  { id: 'tail-whip',    name: 'Tail Whip',    type: 'Normal',   category: 'status',   power: 0,   pp: 30, accuracy: 100 },
  { id: 'smokescreen',  name: 'Smokescreen',  type: 'Normal',   category: 'status',   power: 0,   pp: 20, accuracy: 100 },
  { id: 'leer',         name: 'Leer',         type: 'Normal',   category: 'status',   power: 0,   pp: 30, accuracy: 100 },
  { id: 'roar',         name: 'Roar',         type: 'Normal',   category: 'status',   power: 0,   pp: 20, accuracy: 100 },
  { id: 'screech',      name: 'Screech',      type: 'Normal',   category: 'status',   power: 0,   pp: 40, accuracy: 85  },
  { id: 'harden',       name: 'Harden',       type: 'Normal',   category: 'status',   power: 0,   pp: 30, accuracy: 100 },
  { id: 'defense-curl', name: 'Defense Curl', type: 'Normal',   category: 'status',   power: 0,   pp: 40, accuracy: 100 },
  { id: 'haze',         name: 'Haze',         type: 'Normal',   category: 'status',   power: 0,   pp: 30, accuracy: 100 },
  { id: 'mist',         name: 'Mist',         type: 'Normal',   category: 'status',   power: 0,   pp: 30, accuracy: 100 },
  { id: 'disable',      name: 'Disable',      type: 'Normal',   category: 'status',   power: 0,   pp: 20, accuracy: 100 },
  { id: 'sand-attack',  name: 'Sand Attack',  type: 'Normal',   category: 'status',   power: 0,   pp: 15, accuracy: 100 },
  { id: 'sing',         name: 'Sing',         type: 'Normal',   category: 'status',   power: 0,   pp: 15, accuracy: 55  },
  { id: 'metronome',    name: 'Metronome',    type: 'Normal',   category: 'status',   power: 0,   pp: 10, accuracy: 100 },
  { id: 'confuse-ray',  name: 'Confuse Ray',  type: 'Normal',   category: 'status',   power: 0,   pp: 10, accuracy: 100 },

  // ── Water ────────────────────────────────────────────────────────────────
  { id: 'bubble',       name: 'Bubble',       type: 'Water',    category: 'special',  power: 40,  pp: 30, accuracy: 100 },
  { id: 'water-gun',    name: 'Water Gun',    type: 'Water',    category: 'special',  power: 40,  pp: 25, accuracy: 100 },
  { id: 'hydro-pump',   name: 'Hydro Pump',   type: 'Water',    category: 'special',  power: 110, pp: 5,  accuracy: 80  },
  { id: 'withdraw',     name: 'Withdraw',     type: 'Water',    category: 'status',   power: 0,   pp: 40, accuracy: 100 },

  // ── Fire ─────────────────────────────────────────────────────────────────
  { id: 'ember',        name: 'Ember',        type: 'Fire',     category: 'special',  power: 40,  pp: 25, accuracy: 100 },
  { id: 'flamethrower', name: 'Flamethrower', type: 'Fire',     category: 'special',  power: 90,  pp: 15, accuracy: 100 },
  { id: 'fire-spin',    name: 'Fire Spin',    type: 'Fire',     category: 'special',  power: 35,  pp: 15, accuracy: 85  },

  // ── Grass ────────────────────────────────────────────────────────────────
  { id: 'absorb',       name: 'Absorb',       type: 'Grass',    category: 'special',  power: 20,  pp: 25, accuracy: 100 },
  { id: 'vine-whip',    name: 'Vine Whip',    type: 'Grass',    category: 'physical', power: 45,  pp: 25, accuracy: 100 },
  { id: 'razor-leaf',   name: 'Razor Leaf',   type: 'Grass',    category: 'physical', power: 55,  pp: 25, accuracy: 95  },
  { id: 'petal-dance',  name: 'Petal Dance',  type: 'Grass',    category: 'special',  power: 120, pp: 10, accuracy: 100 },
  { id: 'solar-beam',   name: 'SolarBeam',    type: 'Grass',    category: 'special',  power: 120, pp: 10, accuracy: 100 },
  { id: 'leech-seed',   name: 'Leech Seed',   type: 'Grass',    category: 'status',   power: 0,   pp: 10, accuracy: 90  },
  { id: 'poison-powder',name: 'PoisonPowder', type: 'Poison',   category: 'status',   power: 0,   pp: 35, accuracy: 75  },

  // ── Rock ─────────────────────────────────────────────────────────────────
  { id: 'rock-throw',   name: 'Rock Throw',   type: 'Rock',     category: 'physical', power: 50,  pp: 15, accuracy: 90  },

  // ── Ground ───────────────────────────────────────────────────────────────
  { id: 'earthquake',   name: 'Earthquake',   type: 'Ground',   category: 'physical', power: 100, pp: 10, accuracy: 100 },
  { id: 'dig',          name: 'Dig',          type: 'Ground',   category: 'physical', power: 80,  pp: 10, accuracy: 100 },

  // ── Rock (additional) ──────────────────────────────────────────────────────
  { id: 'rock-slide',   name: 'Rock Slide',   type: 'Rock',     category: 'physical', power: 75,  pp: 10, accuracy: 90  },

  // ── Bug ────────────────────────────────────────────────────────────────────
  { id: 'leech-life',   name: 'Leech Life',   type: 'Bug',      category: 'physical', power: 20,  pp: 15, accuracy: 100 },
  { id: 'pin-missile',  name: 'Pin Missile',  type: 'Bug',      category: 'physical', power: 25,  pp: 20, accuracy: 95  },

  // ── Poison (additional) ────────────────────────────────────────────────────
  { id: 'sludge',       name: 'Sludge',       type: 'Poison',   category: 'special',  power: 65,  pp: 20, accuracy: 100 },

  // ── Psychic ────────────────────────────────────────────────────────────────
  { id: 'confusion',    name: 'Confusion',    type: 'Psychic',  category: 'special',  power: 50,  pp: 25, accuracy: 100 },
  { id: 'psychic',      name: 'Psychic',      type: 'Psychic',  category: 'special',  power: 90,  pp: 10, accuracy: 100 },

  // ── Fighting ───────────────────────────────────────────────────────────────
  { id: 'karate-chop',  name: 'Karate Chop',  type: 'Fighting', category: 'physical', power: 50,  pp: 25, accuracy: 100 },
  { id: 'submission',   name: 'Submission',   type: 'Fighting', category: 'physical', power: 80,  pp: 20, accuracy: 80  },

  // ── Ghost ──────────────────────────────────────────────────────────────────
  { id: 'lick',         name: 'Lick',         type: 'Ghost',    category: 'physical', power: 30,  pp: 30, accuracy: 100 },
  { id: 'night-shade',  name: 'Night Shade',  type: 'Ghost',    category: 'special',  power: 40,  pp: 15, accuracy: 100 },

  // ── Ice ────────────────────────────────────────────────────────────────────
  { id: 'aurora-beam',  name: 'Aurora Beam',  type: 'Ice',      category: 'special',  power: 65,  pp: 20, accuracy: 100 },
  { id: 'ice-beam',     name: 'Ice Beam',     type: 'Ice',      category: 'special',  power: 90,  pp: 10, accuracy: 100 },
];

export const MOVES_MAP = new Map<string, Move>(MOVES_LIST.map((m) => [m.id, m]));

export function getMove(id: string): Move | undefined {
  return MOVES_MAP.get(id);
}
