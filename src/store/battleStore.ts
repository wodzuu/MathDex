import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { OwnedPokemon } from '../types/gameState';
import type { EncounterTier } from '../types/dungeon';

// ── Battle state shape ────────────────────────────────────────────────────────
// Only what must survive client-side navigation away from the battle screen
// (e.g. opening a Pokédex entry mid-battle) lives here. Everything transient —
// panels, puzzles, timers, floats, focus — is BattleScreen component state.

export interface BattleState {
  /** Wild Pokémon being fought. Generated fresh for each encounter. */
  enemy: OwnedPokemon;
  /**
   * Enemy HP as a percentage 0–100. Stored separately so the HP bar can
   * animate smoothly without mutating the entity struct.
   */
  enemyHpPercent: number;
  /** instanceId of the player's currently active Pokémon. */
  activePlayerInstanceId: string;
  /**
   * Whether the battle's opening (the faster-enemy free strike, or nothing when
   * the player is faster) has happened. Persisted so leaving the battle screen
   * and returning — e.g. to view a Pokédex entry — doesn't replay it.
   */
  openingResolved: boolean;
  /** Encounter difficulty tier — drives the aura + reward multiplier. */
  tier?: EncounterTier;
}

// ── Store state shape ─────────────────────────────────────────────────────────

interface BattleStoreState {
  /**
   * Active battle state. null when no battle is in progress.
   * Set by startBattle, cleared by endBattle.
   */
  battle: BattleState | null;

  /** Initialise a new battle. */
  startBattle: (enemy: OwnedPokemon, activePlayerInstanceId: string, tier?: EncounterTier) => void;
  /** Flag the opening strike as done, so it isn't replayed on remount. */
  markOpeningResolved: () => void;
  /** Persist the enemy HP bar (0–100) across navigation. */
  setEnemyHpPct: (pct: number) => void;
  /** Switch the active player Pokémon (free — no enemy turn). Spec §4.6. */
  switchActive: (instanceId: string) => void;
  /** Clear the battle state entirely. */
  endBattle: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useBattleStore = create<BattleStoreState>()(
  devtools(
    (set) => ({
      battle: null,

      startBattle: (enemy, activePlayerInstanceId, tier) =>
        set(
          {
            battle: {
              enemy,
              enemyHpPercent: 100,
              activePlayerInstanceId,
              openingResolved: false,
              tier,
            } satisfies BattleState,
          },
          false,
          'startBattle',
        ),

      markOpeningResolved: () =>
        set(
          (s) => (s.battle ? { battle: { ...s.battle, openingResolved: true } } : s),
          false,
          'markOpeningResolved',
        ),

      setEnemyHpPct: (pct) =>
        set(
          (s) =>
            s.battle
              ? { battle: { ...s.battle, enemyHpPercent: Math.max(0, Math.min(100, pct)) } }
              : s,
          false,
          'setEnemyHpPct',
        ),

      switchActive: (instanceId) =>
        set(
          (s) => (s.battle ? { battle: { ...s.battle, activePlayerInstanceId: instanceId } } : s),
          false,
          'switchActive',
        ),

      endBattle: () => set({ battle: null }, false, 'endBattle'),
    }),
    { name: 'MathDex/BattleStore' },
  ),
);
