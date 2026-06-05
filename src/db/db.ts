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
