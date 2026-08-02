import Dexie, { type Table } from 'dexie';
import type { GameState } from '../types/gameState';

class MathDexDB extends Dexie {
  saves!: Table<{ id: number; state: GameState }>;
  constructor() {
    super('MathDex-v2');
    this.version(1).stores({ saves: 'id' });
  }
}

const db = new MathDexDB();

/**
 * Ask the browser to mark this origin's storage as persistent, so the save
 * in IndexedDB is exempt from best-effort eviction (storage pressure,
 * Safari's inactivity-based cleanup). Safe to call on every boot: if already
 * granted it just returns true. Returns false where unsupported or denied —
 * the game still works, the save is just evictable.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function loadGameState(): Promise<GameState | null> {
  const row = await db.saves.get(1);
  return row?.state ?? null;
}

export async function saveGameState(state: GameState): Promise<void> {
  await db.saves.put({ id: 1, state });
}

export async function clearGameState(): Promise<void> {
  await db.saves.clear();
}
