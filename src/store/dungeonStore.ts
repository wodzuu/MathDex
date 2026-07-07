/**
 * dungeonStore — the wild encounters currently on offer.
 *
 * There are no floors. The dungeon presents THREE opponents at once; the player
 * picks one to fight. Defeating or catching an opponent replaces only that slot
 * with a fresh roll; the other two remain. Fleeing leaves the slot untouched.
 *
 * Transient (not saved to Dexie); persists across the remounts caused by
 * navigating to /battle and back.
 */

import { create }   from 'zustand';
import { devtools } from 'zustand/middleware';
import type { EncounterData, EncounterTier } from '../types/dungeon';
import { useGameStore } from './gameStore';

/** How many opponents are offered at once. */
export const ENCOUNTER_SLOTS = 3;

/** An Alpha boss appears on the roll after every ALPHA_EVERY-th victory. */
export const ALPHA_EVERY = 10;

/**
 * Roll one encounter via the game store, which stage-gates by level,
 * rarity-weights the pick, power-scales the level, and advances the pity
 * counters (§6.2). `tier` marks the strong/alpha rolls.
 */
function rollOne(partyHighestLevel: number, itemSystemActive: boolean, tier?: EncounterTier): EncounterData {
  return useGameStore.getState().rollEncounter(partyHighestLevel, itemSystemActive, tier);
}

/** True when the periodic Alpha boss is owed and none is already on offer. */
function alphaDue(current: EncounterData[]): boolean {
  const s = useGameStore.getState();
  const t = s.trainers.find((x) => x.id === s.activeTrainerId);
  const victories = t?.stats.totalBattles ?? 0;
  return victories > 0 && victories % ALPHA_EVERY === 0 && !current.some((e) => e.tier === 'alpha');
}

interface DungeonState {
  /** The opponents on offer (up to ENCOUNTER_SLOTS). Empty = not in the dungeon. */
  encounters: EncounterData[];
  /** Index of the opponent currently being fought, set when the player taps Fight. */
  activeIndex: number | null;

  /** Fill all slots with fresh opponents (e.g. on entering the dungeon). */
  rollAll: (partyHighestLevel: number, itemSystemActive: boolean) => void;
  /** Remember which slot the player chose to fight. */
  selectEncounter: (index: number | null) => void;
  /** Replace the fought slot with a fresh opponent, then clear the selection. */
  replaceActive: (partyHighestLevel: number, itemSystemActive: boolean) => void;
  /** Clear all encounters when returning to town or blacking out. */
  exitDungeon: () => void;
}

export const useDungeonStore = create<DungeonState>()(
  devtools(
    (set) => ({
      encounters: [],
      activeIndex: null,

      // One of the three slots is always the risk/reward "strong" roll — or the
      // periodic Alpha boss when one is owed (every ALPHA_EVERY victories).
      rollAll: (lvl, active) =>
        set(
          {
            encounters: [
              rollOne(lvl, active),
              rollOne(lvl, active),
              rollOne(lvl, active, alphaDue([]) ? 'alpha' : 'strong'),
            ],
            activeIndex: null,
          },
          false,
          'rollAll',
        ),

      selectEncounter: (index) => set({ activeIndex: index }, false, 'selectEncounter'),

      replaceActive: (lvl, active) =>
        set(
          (s) => {
            if (s.activeIndex === null) return {};
            const encounters = s.encounters.slice();
            const remaining  = encounters.filter((_, i) => i !== s.activeIndex);
            // Keep the board interesting: an owed Alpha takes the slot; otherwise
            // make sure exactly one "strong" roll remains on offer.
            const tier: EncounterTier | undefined = alphaDue(remaining)
              ? 'alpha'
              : !remaining.some((e) => e.tier === 'strong') ? 'strong' : undefined;
            encounters[s.activeIndex] = rollOne(lvl, active, tier);
            return { encounters, activeIndex: null };
          },
          false,
          'replaceActive',
        ),

      exitDungeon: () => set({ encounters: [], activeIndex: null }, false, 'exitDungeon'),
    }),
    { name: 'MathDex/DungeonStore' },
  ),
);
