import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { BattlePhase, DamageFloat, ExpGain } from '../types/battle';
import type { Move } from '../types/moves';
import type { MathPuzzle } from '../types/math';
import type { OwnedPokemon } from '../types/gameState';

// ── Battle state shape ────────────────────────────────────────────────────────

export interface BattleState {
  phase: BattlePhase;
  /** Wild Pokémon being fought. Generated fresh for each encounter. */
  enemy: OwnedPokemon;
  /**
   * Enemy HP as a percentage 0–100. Stored separately so the HP bar can
   * animate smoothly without mutating the entity struct.
   */
  enemyHpPercent: number;
  /** instanceId of the player's currently active (Lead) Pokémon. */
  activePlayerInstanceId: string;
  /**
   * instanceIds of every player Pokémon that has been sent out this battle.
   * At battle end, all instanceIds here receive the full EXP award. Spec §4.7.
   */
  participantInstanceIds: string[];
  /** Move chosen during 'move-select', kept while phase is 'math'. */
  selectedMove: Move | null;
  /** Active math puzzle while phase is 'math'. */
  currentPuzzle: MathPuzzle | null;
  /**
   * Number of consecutive correct answers (0–4 visible pips).
   * At 5 consecutive correct answers, next hit is a Critical Hit (×1.5).
   * Resets to 0 on any incorrect answer. Spec §4.4.
   */
  focusPips: number;
  /** Transient damage floaters rendered over the enemy sprite. */
  damageFloats: DamageFloat[];
  turnCount: number;
  /** Populated once phase reaches 'victory'. Shown on the victory screen. */
  expGains: ExpGain[];
}

// ── Store state shape ─────────────────────────────────────────────────────────

interface BattleStoreState {
  /**
   * Active battle state. null when no battle is in progress.
   * Set by startBattle, cleared by endBattle.
   */
  battle: BattleState | null;

  // ── Actions ───────────────────────────────────────────────────────────

  /** Initialise a new battle. Automatically marks the Lead as a participant. */
  startBattle: (enemy: OwnedPokemon, activePlayerInstanceId: string) => void;

  setPhase: (phase: BattlePhase) => void;
  selectMove: (move: Move) => void;
  setPuzzle: (puzzle: MathPuzzle | null) => void;

  /**
   * Record an attack landing — adds a damage float and increments turn count.
   * Does NOT mutate HP directly; HP is derived from hp percent (setEnemyHpPct).
   */
  addDamageFloat: (amount: number, correct: boolean) => void;

  /** Remove a damage float by id once its CSS animation completes. */
  removeDamageFloat: (id: number) => void;

  /**
   * Advance or reset the Focus Meter after a math answer.
   * Spec §4.4: 5 consecutive correct = crit + reset.
   */
  advanceFocus: (correct: boolean) => void;

  setEnemyHpPct: (pct: number) => void;

  /**
   * Switch the active player Pokémon.
   * Automatically marks the incoming Pokémon as a battle participant.
   * Spec §4.6.
   */
  switchActive: (instanceId: string) => void;

  /** Mark a Pokémon as having participated (sent out) this battle. */
  markParticipant: (instanceId: string) => void;

  /** Move to a terminal phase (victory / fled / blacked-out) and store EXP gains. */
  resolveBattle: (
    outcome: Extract<BattlePhase, 'victory' | 'fled' | 'blacked-out'>,
    expGains?: ExpGain[],
  ) => void;

  /** Clear the battle state entirely. Call after victory/result screens close. */
  endBattle: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useBattleStore = create<BattleStoreState>()(
  devtools(
    (set) => ({
      battle: null,

      startBattle: (enemy, activePlayerInstanceId) =>
        set(
          {
            battle: {
              phase: 'pre',
              enemy,
              enemyHpPercent: 100,
              activePlayerInstanceId,
              participantInstanceIds: [activePlayerInstanceId],
              selectedMove: null,
              currentPuzzle: null,
              focusPips: 0,
              damageFloats: [],
              turnCount: 0,
              expGains: [],
            } satisfies BattleState,
          },
          false,
          'startBattle',
        ),

      setPhase: (phase) =>
        set(
          (s) => (s.battle ? { battle: { ...s.battle, phase } } : s),
          false,
          'setPhase',
        ),

      selectMove: (move) =>
        set(
          (s) => (s.battle ? { battle: { ...s.battle, selectedMove: move } } : s),
          false,
          'selectMove',
        ),

      setPuzzle: (puzzle) =>
        set(
          (s) => (s.battle ? { battle: { ...s.battle, currentPuzzle: puzzle } } : s),
          false,
          'setPuzzle',
        ),

      addDamageFloat: (amount, correct) => {
        const float: DamageFloat = { id: Date.now(), amount, correct };
        set(
          (s) =>
            s.battle
              ? {
                  battle: {
                    ...s.battle,
                    damageFloats: [...s.battle.damageFloats, float],
                    turnCount: s.battle.turnCount + 1,
                  },
                }
              : s,
          false,
          'addDamageFloat',
        );
      },

      removeDamageFloat: (id) =>
        set(
          (s) =>
            s.battle
              ? {
                  battle: {
                    ...s.battle,
                    damageFloats: s.battle.damageFloats.filter((f) => f.id !== id),
                  },
                }
              : s,
          false,
          'removeDamageFloat',
        ),

      advanceFocus: (correct) =>
        set(
          (s) => {
            if (!s.battle) return s;
            const newPips = correct ? Math.min(5, s.battle.focusPips + 1) : 0;
            return { battle: { ...s.battle, focusPips: newPips } };
          },
          false,
          'advanceFocus',
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
          (s) => {
            if (!s.battle) return s;
            const participants = s.battle.participantInstanceIds.includes(instanceId)
              ? s.battle.participantInstanceIds
              : [...s.battle.participantInstanceIds, instanceId];
            return {
              battle: {
                ...s.battle,
                activePlayerInstanceId: instanceId,
                participantInstanceIds: participants,
                // Switching mid-battle via the carousel is free — no enemy turn.
              },
            };
          },
          false,
          'switchActive',
        ),

      markParticipant: (instanceId) =>
        set(
          (s) => {
            if (!s.battle || s.battle.participantInstanceIds.includes(instanceId)) return s;
            return {
              battle: {
                ...s.battle,
                participantInstanceIds: [...s.battle.participantInstanceIds, instanceId],
              },
            };
          },
          false,
          'markParticipant',
        ),

      resolveBattle: (outcome, expGains = []) =>
        set(
          (s) =>
            s.battle
              ? { battle: { ...s.battle, phase: outcome, expGains } }
              : s,
          false,
          'resolveBattle',
        ),

      endBattle: () => set({ battle: null }, false, 'endBattle'),
    }),
    { name: 'MathDex/BattleStore' },
  ),
);
