/**
 * dungeonStore — the current wild encounter.
 *
 * There are no floors. The dungeon is an infinite stream of single encounters;
 * this store holds the one the player is currently facing. It persists across
 * the remounts caused by navigating to /battle and back. Not saved to Dexie.
 */

import { create }   from 'zustand';
import { devtools } from 'zustand/middleware';
import type { EncounterData } from '../types/dungeon';
import { generateEncounter } from '../lib/encounterGenerator';

interface DungeonState {
  /** The wild Pokémon currently being faced. null = player is not in the dungeon. */
  encounter: EncounterData | null;

  /** Roll a fresh encounter scaled to the player's strongest Pokémon. */
  rollEncounter: (partyHighestLevel: number, itemSystemActive: boolean) => void;

  /** Clear the encounter when returning to town or blacking out. */
  exitDungeon: () => void;
}

export const useDungeonStore = create<DungeonState>()(
  devtools(
    (set) => ({
      encounter: null,

      rollEncounter: (partyHighestLevel, itemSystemActive) =>
        set(
          { encounter: generateEncounter(partyHighestLevel, itemSystemActive) },
          false,
          'rollEncounter',
        ),

      exitDungeon: () => set({ encounter: null }, false, 'exitDungeon'),
    }),
    { name: 'MathDex/DungeonStore' },
  ),
);
