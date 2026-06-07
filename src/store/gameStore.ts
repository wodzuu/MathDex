import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GameState, Trainer, OwnedPokemon, Pokeballs, Potions } from '../types/gameState';
import type { MathTopic } from '../types/math';
import { levelFromExp, calcHp } from '../lib/formulas';
import { getSpecies } from '../data/species';
import { getMove } from '../data/moves';

// ── Exported helpers ──────────────────────────────────────────────────────────

export function getPartyPokemon(trainer: Trainer): OwnedPokemon[] {
  return trainer.party
    .map(id => trainer.caughtPokemon.find(p => p.instanceId === id))
    .filter((p): p is OwnedPokemon => p !== undefined);
}

export function getPcBoxPokemon(trainer: Trainer): OwnedPokemon[] {
  const partySet = new Set(trainer.party);
  return trainer.caughtPokemon.filter(p => !partySet.has(p.instanceId));
}

export function isItemSystemActive(trainer: Trainer): boolean {
  return trainer.caughtPokemon.some(p => levelFromExp(p.totalExp) >= 20);
}

/** Highest level among the active party (1 if the party is empty). */
export function getPartyHighestLevel(trainer: Trainer): number {
  const levels = getPartyPokemon(trainer).map(p => levelFromExp(p.totalExp));
  return levels.length ? Math.max(...levels) : 1;
}

/** instanceId of the active fighter — the stored lead if valid, else party[0]. */
export function getLeadInstanceId(trainer: Trainer): string {
  if (trainer.leadInstanceId && trainer.party.includes(trainer.leadInstanceId)) {
    return trainer.leadInstanceId;
  }
  return trainer.party[0] ?? '';
}

// ── Internal helper ───────────────────────────────────────────────────────────

function patchTrainer(
  s: GameState,
  update: (t: Trainer) => Partial<Trainer>,
): Pick<GameState, 'trainers'> {
  return {
    trainers: s.trainers.map(t =>
      t.id !== s.activeTrainerId ? t : { ...t, ...update(t) }
    ),
  };
}

// ── State ─────────────────────────────────────────────────────────────────────

interface GameStoreState extends GameState {
  hydrateFromSave: (state: GameState) => void;

  updatePokemon:    (instanceId: string, patch: Partial<OwnedPokemon>) => void;
  addCaughtPokemon: (pokemon: Omit<OwnedPokemon, 'instanceId'>) => OwnedPokemon;
  setParty:         (partyIds: string[]) => void;
  setLead:          (instanceId: string) => void;
  depositPokemon:   (instanceId: string) => void;
  withdrawPokemon:  (instanceId: string) => void;
  healParty:        () => void;

  earnPokeDollars:  (amount: number) => void;
  spendPokeDollars: (amount: number) => void;
  adjustPokeballs:  (key: keyof Pokeballs, delta: number) => void;
  adjustPotions:    (key: keyof Potions,   delta: number) => void;

  setCurrentFloor: (floor: number) => void;
  setMaxPartySize: (size: number)  => void;

  recordMathAttempt:    (topic: MathTopic, correct: boolean) => void;
  incrementBattleCount: () => void;
}

const EMPTY: GameState = { version: 1, activeTrainerId: '', trainers: [], settings: {} };

export const useGameStore = create<GameStoreState>()(
  devtools(
    (set) => ({
      ...EMPTY,

      hydrateFromSave: (state) => set(state, false, 'hydrateFromSave'),

      updatePokemon: (instanceId, patch) =>
        set((s) => patchTrainer(s, (t) => ({
          caughtPokemon: t.caughtPokemon.map(p =>
            p.instanceId !== instanceId ? p : { ...p, ...patch }
          ),
        })), false, 'updatePokemon'),

      addCaughtPokemon: (pokemon) => {
        const newPokemon: OwnedPokemon = { ...pokemon, instanceId: crypto.randomUUID() };
        set((s) => patchTrainer(s, (t) => ({
          caughtPokemon: [...t.caughtPokemon, newPokemon],
        })), false, 'addCaughtPokemon');
        return newPokemon;
      },

      setParty: (partyIds) =>
        set((s) => patchTrainer(s, () => ({ party: partyIds })), false, 'setParty'),

      setLead: (instanceId) =>
        set((s) => patchTrainer(s, () => ({ leadInstanceId: instanceId })), false, 'setLead'),

      depositPokemon: (instanceId) =>
        set((s) => patchTrainer(s, (t) => ({
          party: t.party.filter(id => id !== instanceId),
        })), false, 'depositPokemon'),

      withdrawPokemon: (instanceId) =>
        set((s) => patchTrainer(s, (t) => {
          if (t.party.length >= t.maxPartySize || t.party.includes(instanceId)) return {};
          return { party: [...t.party, instanceId] };
        }), false, 'withdrawPokemon'),

      healParty: () =>
        set((s) => patchTrainer(s, (t) => ({
          caughtPokemon: t.caughtPokemon.map(p => {
            if (!t.party.includes(p.instanceId)) return p;
            const species = getSpecies(p.speciesId);
            if (!species) return p;
            const level = levelFromExp(p.totalExp);
            // Full heal: restore HP and every move's PP to its maximum
            return {
              ...p,
              currentHp: calcHp(species.baseStats.hp, level),
              moves: p.moves.map(m => ({ ...m, currentPp: getMove(m.moveId)?.pp ?? m.currentPp })),
            };
          }),
        })), false, 'healParty'),

      earnPokeDollars:  (amount) =>
        set((s) => patchTrainer(s, (t) => ({ pokeDollars: t.pokeDollars + amount })), false, 'earnPokeDollars'),

      spendPokeDollars: (amount) =>
        set((s) => patchTrainer(s, (t) => ({ pokeDollars: Math.max(0, t.pokeDollars - amount) })), false, 'spendPokeDollars'),

      adjustPokeballs: (key, delta) =>
        set((s) => patchTrainer(s, (t) => ({
          pokeballs: { ...t.pokeballs, [key]: Math.max(0, t.pokeballs[key] + delta) },
        })), false, 'adjustPokeballs'),

      adjustPotions: (key, delta) =>
        set((s) => patchTrainer(s, (t) => ({
          potions: { ...t.potions, [key]: Math.max(0, t.potions[key] + delta) },
        })), false, 'adjustPotions'),

      setCurrentFloor: (floor) =>
        set((s) => patchTrainer(s, (t) => ({
          currentFloor: floor,
          deepestFloor: Math.max(t.deepestFloor, floor),
        })), false, 'setCurrentFloor'),

      setMaxPartySize: (size) =>
        set((s) => patchTrainer(s, () => ({ maxPartySize: size })), false, 'setMaxPartySize'),

      recordMathAttempt: (topic, correct) =>
        set((s) => patchTrainer(s, (t) => {
          const prev = t.stats.topicAccuracy[topic] ?? { attempted: 0, correct: 0 };
          const newStreak = correct ? t.stats.currentStreak + 1 : 0;
          return {
            stats: {
              ...t.stats,
              totalProblemsAttempted: t.stats.totalProblemsAttempted + 1,
              totalProblemsSolved:    t.stats.totalProblemsSolved + (correct ? 1 : 0),
              currentStreak:          newStreak,
              longestStreak:          Math.max(t.stats.longestStreak, newStreak),
              topicAccuracy: {
                ...t.stats.topicAccuracy,
                [topic]: { attempted: prev.attempted + 1, correct: prev.correct + (correct ? 1 : 0) },
              },
            },
          };
        }), false, 'recordMathAttempt'),

      incrementBattleCount: () =>
        set((s) => patchTrainer(s, (t) => ({
          stats: { ...t.stats, totalBattles: t.stats.totalBattles + 1 },
        })), false, 'incrementBattleCount'),
    }),
    { name: 'MathDex/GameStore' },
  ),
);

/** Returns the active trainer. Must be called after hydration. */
export function useActiveTrainer(): Trainer {
  return useGameStore(s => s.trainers.find(t => t.id === s.activeTrainerId)!);
}
