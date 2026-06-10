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
import type { EncounterData } from '../types/dungeon';
import { generateEncounter } from '../lib/encounterGenerator';
import { useGameStore } from './gameStore';

/** How many opponents are offered at once. */
export const ENCOUNTER_SLOTS = 3;

/** Roll one encounter, drawing its rarity from the persisted shuffle-bag (§6.2). */
function rollOne(partyHighestLevel: number, itemSystemActive: boolean): EncounterData {
  const rarity = useGameStore.getState().drawEncounterRarity();
  return generateEncounter(partyHighestLevel, itemSystemActive, rarity);
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

      rollAll: (lvl, active) =>
        set(
          { encounters: Array.from({ length: ENCOUNTER_SLOTS }, () => rollOne(lvl, active)), activeIndex: null },
          false,
          'rollAll',
        ),

      selectEncounter: (index) => set({ activeIndex: index }, false, 'selectEncounter'),

      replaceActive: (lvl, active) =>
        set(
          (s) => {
            if (s.activeIndex === null) return {};
            const encounters = s.encounters.slice();
            encounters[s.activeIndex] = rollOne(lvl, active);
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
