import { create } from 'zustand';

/**
 * PWA update state, populated by the service-worker registration in
 * components/PwaUpdater.tsx and consumed by the Town hub's "New version
 * available" panel.
 */
interface PwaStore {
  /** True when a new app version is installed and waiting to activate. */
  needRefresh: boolean;
  /** Activate the waiting version and reload the app. */
  update: () => void;
  setNeedRefresh: (v: boolean) => void;
  setUpdate: (fn: () => void) => void;
}

export const usePwaStore = create<PwaStore>((set) => ({
  needRefresh: false,
  update: () => {},
  setNeedRefresh: (needRefresh) => set({ needRefresh }),
  setUpdate: (update) => set({ update }),
}));
