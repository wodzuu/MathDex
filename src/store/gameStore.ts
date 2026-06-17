import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GameState, Trainer, OwnedPokemon, Pokeballs, Potions } from '../types/gameState';
import type { MathTopic } from '../types/math';
import type { EncounterData } from '../types/dungeon';
import { levelFromExp, calcHp, partySlotsForLevel } from '../lib/formulas';
import { getSpecies } from '../data/species';
import { getMove } from '../data/moves';
import { MATH_WINDOW_SIZE, MATH_RANKUP_THRESHOLD, MAX_MATH_RANK } from '../data/curriculum';
import { speciesAtLevel } from '../lib/evolution';
import { pickLevel, pickEncounterSpecies, buildEncounter, EMPTY_PITY } from '../lib/encounterGenerator';

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

/**
 * Unlocked party slots (1–4), derived from the strongest OWNED Pokémon's level
 * (party or box, so a strong boxed Pokémon still counts and can't soft-lock).
 * Spec §6.6.
 */
export function getMaxPartySize(trainer: Trainer): number {
  const strongest = trainer.caughtPokemon.reduce(
    (m, p) => Math.max(m, levelFromExp(p.totalExp)), 1,
  );
  return partySlotsForLevel(strongest);
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


  recordMathAttempt:    (topic: MathTopic, correct: boolean, isReview?: boolean) => void;
  incrementBattleCount: () => void;
  recordOpponentLevel:  (level: number) => void;

  /** Roll one stage-gated, rarity-weighted wild encounter (advances pity). Spec §6.2. */
  rollEncounter:        (partyHighestLevel: number, itemSystemActive: boolean) => EncounterData;

  /** Set the trainer's persisted Focus meter (0–5). Spec §4.4. */
  setFocus: (focus: number) => void;
}

const EMPTY: GameState = { version: 1, activeTrainerId: '', trainers: [], settings: {} };

export const useGameStore = create<GameStoreState>()(
  devtools(
    (set, get) => ({
      ...EMPTY,

      hydrateFromSave: (state) => set(state, false, 'hydrateFromSave'),

      updatePokemon: (instanceId, patch) =>
        set((s) => patchTrainer(s, (t) => ({
          caughtPokemon: t.caughtPokemon.map(p => {
            if (p.instanceId !== instanceId) return p;
            const merged = { ...p, ...patch };
            // Level-driven evolution (spec §6.4): after any change (usually an
            // EXP gain), advance to the form this level has earned. Chains
            // multiple steps if several thresholds were crossed at once.
            const evolvedId = speciesAtLevel(merged.speciesId, levelFromExp(merged.totalExp));
            return evolvedId === merged.speciesId ? merged : { ...merged, speciesId: evolvedId };
          }),
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
          if (t.party.length >= getMaxPartySize(t) || t.party.includes(instanceId)) return {};
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

      recordMathAttempt: (topic, correct, isReview = false) =>
        set((s) => patchTrainer(s, (t) => {
          const prev = t.stats.topicAccuracy[topic] ?? { attempted: 0, correct: 0 };
          const newStreak = correct ? t.stats.currentStreak + 1 : 0;

          // Math Rank progression (spec §3): only current-rank challenges count
          // toward the rolling window; review challenges are excluded. Rank up
          // when a full window clears the threshold, then reset. Never demote.
          let mathRank   = t.mathRank ?? 1;
          let mathWindow = t.mathWindow ?? [];
          if (!isReview && mathRank < MAX_MATH_RANK) {
            mathWindow = [...mathWindow, correct].slice(-MATH_WINDOW_SIZE);
            if (mathWindow.length >= MATH_WINDOW_SIZE) {
              const rate = mathWindow.filter(Boolean).length / mathWindow.length;
              if (rate >= MATH_RANKUP_THRESHOLD) {
                mathRank += 1;
                mathWindow = [];
              }
            }
          }

          return {
            mathRank,
            mathWindow,
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

      recordOpponentLevel: (level) =>
        set((s) => patchTrainer(s, (t) => {
          const best = Math.max(t.stats.highestOpponentLevel ?? 0, level);
          if (best === (t.stats.highestOpponentLevel ?? 0)) return {};
          return { stats: { ...t.stats, highestOpponentLevel: best } };
        }), false, 'recordOpponentLevel'),

      rollEncounter: (partyHighestLevel, itemSystemActive) => {
        const level  = pickLevel(partyHighestLevel);
        const s      = get();
        const active = s.trainers.find(t => t.id === s.activeTrainerId);
        const { species, pity } = pickEncounterSpecies(level, active?.encounterPity ?? EMPTY_PITY);
        set((st) => patchTrainer(st, () => ({ encounterPity: pity })), false, 'rollEncounter');
        return buildEncounter(species, level, itemSystemActive);
      },

      setFocus: (focus) =>
        set((s) => patchTrainer(s, () => ({ focus: Math.max(0, Math.min(5, focus)) })), false, 'setFocus'),
    }),
    { name: 'MathDex/GameStore' },
  ),
);

/** Returns the active trainer. Must be called after hydration. */
export function useActiveTrainer(): Trainer {
  return useGameStore(s => s.trainers.find(t => t.id === s.activeTrainerId)!);
}
