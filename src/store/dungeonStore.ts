/**
 * dungeonStore — state for one active dungeon run.
 *
 * Responsibilities:
 *   - Hold the procedurally generated rooms for the current floor.
 *   - Track which rooms the player has cleared this session.
 *   - Expose enterFloor / clearRoom / exitDungeon actions.
 *
 * Not persisted to Dexie directly. On app reload, the DungeonScreen's
 * useEffect re-generates the floor from gameStore.currentFloor.
 * Cleared room state resets each time the player enters or re-enters a floor.
 */

import { create }     from 'zustand';
import { devtools }   from 'zustand/middleware';
import type { DungeonFloor } from '../types/dungeon';
import { generateFloor }     from '../lib/floorGenerator';

interface DungeonState {
  /** Active floor data. null = player is not currently in the dungeon. */
  floor: DungeonFloor | null;

  /**
   * Generate rooms for the given floor number and set them as the active floor.
   * Clears any previously cleared-room state automatically.
   * Called by TownScreen before navigating, and by DungeonScreen on mount/descend.
   */
  enterFloor: (floorNumber: number) => void;

  /** Mark a single room as cleared (persists for the current floor session). */
  clearRoom: (roomId: string) => void;

  /** Reset the floor to null when the player returns to town or blacks out. */
  exitDungeon: () => void;
}

export const useDungeonStore = create<DungeonState>()(
  devtools(
    (set) => ({
      floor: null,

      enterFloor: (floorNumber) =>
        set(
          { floor: generateFloor(floorNumber, false) },
          false,
          'enterFloor',
        ),

      clearRoom: (roomId) =>
        set(
          (s) =>
            s.floor
              ? {
                  floor: {
                    ...s.floor,
                    rooms: s.floor.rooms.map((r) =>
                      r.id === roomId ? { ...r, cleared: true } : r,
                    ),
                  },
                }
              : s,
          false,
          'clearRoom',
        ),

      exitDungeon: () => set({ floor: null }, false, 'exitDungeon'),
    }),
    { name: 'MathDex/DungeonStore' },
  ),
);
