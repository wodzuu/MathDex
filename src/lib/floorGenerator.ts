/**
 * Procedural dungeon floor generator.
 *
 * Each call produces a fresh DungeonFloor with 4–5 rooms.
 * Generation is intentionally non-deterministic (Math.random) — the
 * player sees different room layouts each time they enter a floor.
 * Cleared state is tracked separately in dungeonStore, not here.
 *
 * Room layout patterns:
 *   Normal floor : [encounter(M)] [optional] [optional] [encounter(M)] [stairs]
 *   Boss floor   : [encounter(M)] [optional]             [encounter(M)] [boss(M)] [stairs]
 *
 * Floor 1–2 skip the second optional to keep the tutorial simple.
 * Spec refs: §2.4 (floor map), §2.5 (room types), §5.2 (item rarities), §3.1 (curriculum).
 */

import type { DungeonFloor, Room, EncounterData } from '../types/dungeon';
import type { ItemRarity } from '../types/items';
import type { PokeType, PokemonRarity } from '../types/pokemon';
import type { MathTopic } from '../types/math';
import { FLOOR_TOPIC } from '../types/math';

// ── Species pool ──────────────────────────────────────────────────────────────

interface PoolEntry {
  speciesId:    string;
  speciesName:  string;
  dexNumber:    number;
  type:         PokeType;
  minFloor:     number;
  maxFloor:     number;
  /** Relative spawn weight within the floor range. Higher = more common. */
  weight:       number;
  rarity:       PokemonRarity;
  /** Can this species appear as the boss of a floor block? */
  isBossCandidate: boolean;
}

// All Gen 1 species from src/data/species.ts, across the 6 launch types.
const POOL: PoolEntry[] = [
  // ── Normal ──────────────────────────────────────────────────────────────────
  { speciesId:'rattata',    speciesName:'Rattata',    dexNumber: 19,  type:'Normal',   minFloor: 1, maxFloor:18, weight:10, rarity:'Common',   isBossCandidate:false },
  { speciesId:'meowth',     speciesName:'Meowth',     dexNumber: 52,  type:'Normal',   minFloor: 1, maxFloor:22, weight: 6, rarity:'Common',   isBossCandidate:false },
  { speciesId:'jigglypuff', speciesName:'Jigglypuff', dexNumber: 39,  type:'Normal',   minFloor: 1, maxFloor:20, weight: 5, rarity:'Common',   isBossCandidate:false },
  { speciesId:'clefairy',   speciesName:'Clefairy',   dexNumber: 35,  type:'Normal',   minFloor: 3, maxFloor:28, weight: 4, rarity:'Uncommon', isBossCandidate:false },
  { speciesId:'eevee',      speciesName:'Eevee',      dexNumber:133,  type:'Normal',   minFloor: 8, maxFloor:35, weight: 3, rarity:'Rare',     isBossCandidate:true  },

  // ── Rock ────────────────────────────────────────────────────────────────────
  { speciesId:'geodude',   speciesName:'Geodude',   dexNumber: 74,  type:'Rock',     minFloor: 1, maxFloor:22, weight: 8, rarity:'Common',   isBossCandidate:false },
  { speciesId:'graveler',  speciesName:'Graveler',  dexNumber: 75,  type:'Rock',     minFloor:20, maxFloor:40, weight: 5, rarity:'Uncommon', isBossCandidate:true  },
  { speciesId:'onix',      speciesName:'Onix',      dexNumber: 95,  type:'Rock',     minFloor: 5, maxFloor:35, weight: 4, rarity:'Uncommon', isBossCandidate:true  },

  // ── Electric ────────────────────────────────────────────────────────────────
  { speciesId:'voltorb',   speciesName:'Voltorb',   dexNumber:100,  type:'Electric', minFloor: 3, maxFloor:22, weight: 7, rarity:'Common',   isBossCandidate:false },
  { speciesId:'magnemite', speciesName:'Magnemite', dexNumber: 81,  type:'Electric', minFloor: 1, maxFloor:25, weight: 7, rarity:'Common',   isBossCandidate:false },
  { speciesId:'electrode', speciesName:'Electrode', dexNumber:101,  type:'Electric', minFloor:18, maxFloor:40, weight: 4, rarity:'Uncommon', isBossCandidate:true  },
  { speciesId:'pikachu',   speciesName:'Pikachu',   dexNumber: 25,  type:'Electric', minFloor: 6, maxFloor:35, weight: 5, rarity:'Uncommon', isBossCandidate:true  },
  { speciesId:'raichu',    speciesName:'Raichu',    dexNumber: 26,  type:'Electric', minFloor:30, maxFloor:65, weight: 4, rarity:'Rare',     isBossCandidate:true  },

  // ── Fire ────────────────────────────────────────────────────────────────────
  { speciesId:'growlithe', speciesName:'Growlithe', dexNumber: 58,  type:'Fire',     minFloor: 1, maxFloor:20, weight: 7, rarity:'Common',   isBossCandidate:false },
  { speciesId:'vulpix',    speciesName:'Vulpix',    dexNumber: 37,  type:'Fire',     minFloor: 2, maxFloor:22, weight: 6, rarity:'Uncommon', isBossCandidate:false },
  { speciesId:'charmander',speciesName:'Charmander',dexNumber:  4,  type:'Fire',     minFloor: 2, maxFloor:15, weight: 5, rarity:'Uncommon', isBossCandidate:false },
  { speciesId:'charmeleon',speciesName:'Charmeleon',dexNumber:  5,  type:'Fire',     minFloor:14, maxFloor:30, weight: 4, rarity:'Uncommon', isBossCandidate:true  },
  { speciesId:'ninetales', speciesName:'Ninetales', dexNumber: 38,  type:'Fire',     minFloor:25, maxFloor:50, weight: 3, rarity:'Rare',     isBossCandidate:true  },
  { speciesId:'charizard', speciesName:'Charizard', dexNumber:  6,  type:'Fire',     minFloor:28, maxFloor:65, weight: 3, rarity:'Rare',     isBossCandidate:true  },

  // ── Water ───────────────────────────────────────────────────────────────────
  { speciesId:'poliwag',   speciesName:'Poliwag',   dexNumber: 60,  type:'Water',    minFloor: 1, maxFloor:18, weight: 8, rarity:'Common',   isBossCandidate:false },
  { speciesId:'magikarp',  speciesName:'Magikarp',  dexNumber:129,  type:'Water',    minFloor: 1, maxFloor:20, weight: 9, rarity:'Common',   isBossCandidate:false },
  { speciesId:'squirtle',  speciesName:'Squirtle',  dexNumber:  7,  type:'Water',    minFloor: 2, maxFloor:15, weight: 5, rarity:'Uncommon', isBossCandidate:false },
  { speciesId:'poliwhirl', speciesName:'Poliwhirl', dexNumber: 61,  type:'Water',    minFloor:20, maxFloor:38, weight: 5, rarity:'Uncommon', isBossCandidate:true  },
  { speciesId:'wartortle', speciesName:'Wartortle', dexNumber:  8,  type:'Water',    minFloor:14, maxFloor:30, weight: 4, rarity:'Uncommon', isBossCandidate:true  },
  { speciesId:'gyarados',  speciesName:'Gyarados',  dexNumber:130,  type:'Water',    minFloor:18, maxFloor:45, weight: 3, rarity:'Rare',     isBossCandidate:true  },
  { speciesId:'vaporeon',  speciesName:'Vaporeon',  dexNumber:134,  type:'Water',    minFloor:20, maxFloor:50, weight: 3, rarity:'Rare',     isBossCandidate:true  },

  // ── Grass ───────────────────────────────────────────────────────────────────
  { speciesId:'oddish',    speciesName:'Oddish',    dexNumber: 43,  type:'Grass',    minFloor: 1, maxFloor:18, weight: 7, rarity:'Common',   isBossCandidate:false },
  { speciesId:'bulbasaur', speciesName:'Bulbasaur', dexNumber:  1,  type:'Grass',    minFloor: 2, maxFloor:15, weight: 5, rarity:'Uncommon', isBossCandidate:false },
];

// ── Helper: weighted random pick ──────────────────────────────────────────────

function pickFromPool(floor: number, bossOnly: boolean): PoolEntry {
  const candidates = POOL.filter(
    (e) =>
      floor >= e.minFloor &&
      floor <= e.maxFloor &&
      (!bossOnly || e.isBossCandidate),
  );

  // Graceful fallback: if no boss candidates, widen to any species in range
  const pool = candidates.length > 0 ? candidates : POOL.filter(
    (e) => floor >= e.minFloor && floor <= e.maxFloor,
  );

  // Ultimate fallback to floor-1 pool if completely out of range
  const finalPool = pool.length > 0 ? pool : POOL.slice(0, 3);

  const totalWeight = finalPool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const entry of finalPool) {
    r -= entry.weight;
    if (r <= 0) return entry;
  }
  return finalPool[finalPool.length - 1];
}

// ── Helper: enemy level ───────────────────────────────────────────────────────

function pickLevel(floor: number, isBoss: boolean): number {
  // Regular encounters start ~3 levels above floor so early enemies
  // are a real threat to a fresh level-5 Pikachu (Diablo zone-level principle).
  // Bosses are a further +4 above that baseline.
  const base     = isBoss ? floor + 4 : floor + 3;
  const variance = Math.round((Math.random() - 0.5) * 4);
  return Math.max(2, base + variance);
}

// ── Helper: item rarity for chests and boss drops ────────────────────────────
// Spec §5.2 — rarity scales with dungeon depth.

function pickChestRarity(floor: number): ItemRarity {
  const r = Math.random();
  if (floor >= 60 && r < 0.05) return 'Legendary';
  if (floor >= 40 && r < 0.25) return 'Epic';
  if (floor >= 25 && r < 0.45) return 'Rare';
  if (floor >= 20 && r < 0.55) return 'Uncommon';
  return 'Common';
}

// ── Helper: curriculum topic for a given floor ────────────────────────────────

function topicForFloor(floor: number): MathTopic {
  const entry = FLOOR_TOPIC.find((e) => floor <= e.maxFloor);
  return entry?.topic ?? 'algebra';
}

// ── Room builders ─────────────────────────────────────────────────────────────

function makeEncounterRoom(
  id: string,
  floor: number,
  mandatory: boolean,
  isBoss: boolean,
  itemSystemActive: boolean,
): Room {
  const entry    = pickFromPool(floor, isBoss);
  const level    = pickLevel(floor, isBoss);
  const rarity: PokemonRarity = isBoss ? 'Rare' : entry.rarity;

  const encounter: EncounterData = {
    speciesId:   entry.speciesId,
    speciesName: entry.speciesName,
    dexNumber:   entry.dexNumber,
    type:        entry.type,
    level,
    rarity,
    holdsItem: itemSystemActive,
  };

  return {
    id,
    type:      isBoss ? 'boss' : 'encounter',
    mandatory: mandatory || isBoss,
    cleared:   false,
    encounter,
  };
}

function makeChestRoom(id: string, floor: number): Room {
  return {
    id,
    type:         'chest',
    mandatory:    false,
    cleared:      false,
    chestRarity:  pickChestRarity(floor),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generates a complete DungeonFloor for the given floor number.
 *
 * Room count: 4 rooms for floors 1–2 (tutorial), 5 rooms otherwise.
 * Boss floors (multiples of 5) replace the final mandatory encounter with a boss room.
 * All rooms start with `cleared: false`.
 */
export function generateFloor(
  floorNumber: number,
  itemSystemActive: boolean,
): DungeonFloor {
  const isBossFloor  = floorNumber % 5 === 0;
  const isTutorial   = floorNumber <= 3; // floors 1–3: fixed 3 mandatory encounters, no optionals
  const includeExtra = floorNumber >= 4 && !isBossFloor; // extra optional room from floor 4+

  const rooms: Room[] = [];
  let n = 1;
  const nextId = () => `r${n++}`;

  if (isTutorial) {
    // ── Floors 1–3: exactly 3 mandatory encounters, no optional rooms ─────────
    rooms.push(makeEncounterRoom(nextId(), floorNumber, true, false, itemSystemActive));
    rooms.push(makeEncounterRoom(nextId(), floorNumber, true, false, itemSystemActive));
    rooms.push(makeEncounterRoom(nextId(), floorNumber, true, false, itemSystemActive));
  } else {
    // ── Room 1: first mandatory encounter ──────────────────────────────────────
    rooms.push(makeEncounterRoom(nextId(), floorNumber, true, false, itemSystemActive));

    // ── Room 2: optional (50% encounter, 50% chest) ──────────────────────────
    if (Math.random() < 0.5) {
      rooms.push(makeEncounterRoom(nextId(), floorNumber, false, false, itemSystemActive));
    } else {
      rooms.push(makeChestRoom(nextId(), floorNumber));
    }

    // ── Room 3: second optional chest (floor 4+, 55% chance) ─────────────────
    if (includeExtra && Math.random() < 0.55) {
      rooms.push(makeChestRoom(nextId(), floorNumber));
    }

    // ── Room 4: second mandatory encounter OR boss ────────────────────────────
    if (isBossFloor) {
      rooms.push(makeEncounterRoom(nextId(), floorNumber, true, false, itemSystemActive));
      rooms.push(makeEncounterRoom(nextId(), floorNumber, true, true, itemSystemActive));
    } else {
      rooms.push(makeEncounterRoom(nextId(), floorNumber, true, false, itemSystemActive));
    }
  }

  // ── Stairs: always the final room ─────────────────────────────────────────
  rooms.push({ id: nextId(), type: 'stairs', mandatory: true, cleared: false });

  return {
    floorNumber,
    rooms,
    mathTopic:    topicForFloor(floorNumber),
    isBossFloor,
    revealed:     true,
  };
}
