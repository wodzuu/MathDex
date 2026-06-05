import { useState, useEffect } from 'react';
import { loadGameState, saveGameState } from '../db/db';
import { createNewGame } from '../lib/newGame';
import { useGameStore } from '../store/gameStore';

export type GameInitStatus = 'loading' | 'ready' | 'error';

export function useGameInit(): GameInitStatus {
  const [status, setStatus] = useState<GameInitStatus>('loading');
  const hydrateFromSave = useGameStore(s => s.hydrateFromSave);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        let state = await loadGameState();
        if (!state) {
          state = createNewGame();
          await saveGameState(state);
        }
        if (!cancelled) {
          hydrateFromSave(state);
          setStatus('ready');
        }
      } catch (err) {
        console.error('[useGameInit] failed:', err);
        if (!cancelled) setStatus('error');
      }
    }
    void init();
    return () => { cancelled = true; };
  }, [hydrateFromSave]);

  // Auto-save on every store change, debounced 500ms
  useEffect(() => {
    if (status !== 'ready') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useGameStore.subscribe((s) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const { version, activeTrainerId, trainers, settings } = s;
        void saveGameState({ version, activeTrainerId, trainers, settings });
      }, 500);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [status]);

  return status;
}
