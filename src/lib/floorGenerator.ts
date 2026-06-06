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
import type { PokemonRarity } from '../types/pokemon';
import type { MathTopic } from '../types/math';
import { FLOOR_TOPIC } from '../types/math';

// ── Species pool ──────────────────────────────────────────────────────────────

import { GEN1_POOL, type Gen1PoolEntry } from '../data/gen1';

type PoolEntry = Gen1PoolEntry;

// Full Generation I roster (#1–151). Floor bands + weights are derived per
// rarity in data/gen1.ts so weak commons appear early and rare/legendary deep.
const POOL: PoolEntry[] = GEN1_POOL;

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
