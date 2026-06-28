import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GameState, Trainer, OwnedPokemon, Pokeballs, Potions } from '../types/gameState';
import type { MathTopic } from '../types/math';
import type { EncounterData } from '../types/dungeon';
import { levelFromExp, calcHp, partySlotsForLevel } from '../lib/formulas';
import { getSpecies } from '../data/species';
import { getMove } from '../data/moves';
import { MATH_WINDOW_SIZE, MATH_RANKUP_THRESHOLD, MAX_MATH_RANK, MATH_FASTTRACK_SIZE, MATH_FASTTRACK_MAX_MISTAKES } from '../data/curriculum';
import { evolveOnLevelUp } from '../lib/evolution';
import { pickLevel, pickEncounterSpecies, buildEncounter, EMPTY_PITY } from '../lib/encounterGenerator';
import { makeTrainer } from '../lib/newGame';

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

  /** Create a new trainer (name + starter species) and make it active. */
  createTrainer:    (name: string, starterId: string) => void;
  /** Switch the active trainer to a previously-created one. */
  setActiveTrainer: (id: string) => void;
  /** Rename the active trainer (no-op on an empty name). */
  renameActiveTrainer: (name: string) => void;
  /** Permanently delete a trainer; reassigns the active one if needed. */
  deleteTrainer: (id: string) => void;

  updatePokemon:    (instanceId: string, patch: Partial<OwnedPokemon>) => void;
  addCaughtPokemon: (pokemon: Omit<OwnedPokemon, 'instanceId'>) => OwnedPokemon;
  setParty:         (partyIds: string[]) => void;
  setLead:          (instanceId: string) => void;
  depositPokemon:   (instanceId: string) => void;
  withdrawPokemon:  (instanceId: string) => void;
  /** Swap a boxed Pokémon into the party slot held by a party Pokémon (which
   *  goes to the box). Lets the player change their team even with one slot. */
  swapPokemon:      (boxId: string, partyId: string) => void;
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

      createTrainer: (name, starterId) =>
        set((s) => {
          const trainer = makeTrainer(name, starterId);
          return { trainers: [...s.trainers, trainer], activeTrainerId: trainer.id };
        }, false, 'createTrainer'),

      setActiveTrainer: (id) =>
        set((s) => (s.trainers.some((t) => t.id === id) ? { activeTrainerId: id } : {}), false, 'setActiveTrainer'),

      renameActiveTrainer: (name) =>
        set((s) => {
          const trimmed = name.trim();
          if (!trimmed) return {};
          return patchTrainer(s, () => ({ name: trimmed }));
        }, false, 'renameActiveTrainer'),

      deleteTrainer: (id) =>
        set((s) => {
          const trainers = s.trainers.filter((t) => t.id !== id);
          const activeTrainerId = s.activeTrainerId === id ? (trainers[0]?.id ?? '') : s.activeTrainerId;
          return { trainers, activeTrainerId };
        }, false, 'deleteTrainer'),

      updatePokemon: (instanceId, patch) =>
        set((s) => patchTrainer(s, (t) => ({
          caughtPokemon: t.caughtPokemon.map(p => {
            if (p.instanceId !== instanceId) return p;
            const merged = { ...p, ...patch };
            // Level-driven evolution (spec §6.4): after any change (usually an
            // EXP gain), advance to the form this level has earned. Chains
            // multiple steps if several thresholds were crossed at once, and
            // picks a random form at a branch (Eevee) — fixed once, since the
            // new species id is persisted below.
            const evolvedId = evolveOnLevelUp(merged.speciesId, levelFromExp(merged.totalExp));
            return evolvedId === merged.speciesId ? merged : { ...merged, speciesId: evolvedId };
          }),
        })), false, 'updatePokemon'),

      // Only one Pokémon per species is kept. Catching a species you already
      // own replaces it *in place* (same instanceId, so party/lead references
      // survive) when the new one is a higher level; a lower/equal catch is
      // released. Different species in the same evolution line (Pikachu vs
      // Raichu) are distinct and both kept.
      addCaughtPokemon: (pokemon) => {
        let result: OwnedPokemon = { ...pokemon, instanceId: crypto.randomUUID() };
        set((s) => patchTrainer(s, (t) => {
          const existing = t.caughtPokemon.find((p) => p.speciesId === pokemon.speciesId);
          const stats = { ...t.stats, totalCatches: t.stats.totalCatches + 1 };
          if (existing) {
            if (levelFromExp(pokemon.totalExp) > levelFromExp(existing.totalExp)) {
              const upgraded: OwnedPokemon = { ...existing, totalExp: pokemon.totalExp, currentHp: pokemon.currentHp, moves: pokemon.moves };
              result = upgraded;
              return { caughtPokemon: t.caughtPokemon.map((p) => (p.instanceId === existing.instanceId ? upgraded : p)), stats };
            }
            result = existing;          // keep the one we already have
            return { stats };
          }
          return { caughtPokemon: [...t.caughtPokemon, result], stats };
        }), false, 'addCaughtPokemon');
        return result;
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

      swapPokemon: (boxId, partyId) =>
        set((s) => patchTrainer(s, (t) => {
          // boxId must be owned-but-boxed; partyId must be in the party.
          if (!t.party.includes(partyId) || t.party.includes(boxId)) return {};
          if (!t.caughtPokemon.some((p) => p.instanceId === boxId)) return {};
          const party = t.party.map((id) => (id === partyId ? boxId : id));  // same slot
          const leadInstanceId = t.leadInstanceId === partyId ? boxId : t.leadInstanceId;
          return { party, leadInstanceId };
        }), false, 'swapPokemon'),

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
          // toward the rolling window; review challenges are excluded. The window
          // resets on every rank-up, so its first entries are this rank's first
          // challenges. Two ways to rank up (never demote):
          //   1. Fast-track — ≤2 mistakes in the first 20 challenges of the rank.
          //   2. Normal     — a full 100-window scoring ≥80% correct.
          let mathRank   = t.mathRank ?? 1;
          let mathWindow = t.mathWindow ?? [];
          if (!isReview && mathRank < MAX_MATH_RANK) {
            mathWindow = [...mathWindow, correct].slice(-MATH_WINDOW_SIZE);
            const correctCount = mathWindow.filter(Boolean).length;
            const mistakes     = mathWindow.length - correctCount;
            if (mathWindow.length === MATH_FASTTRACK_SIZE && mistakes <= MATH_FASTTRACK_MAX_MISTAKES) {
              mathRank += 1;
              mathWindow = [];
            } else if (mathWindow.length >= MATH_WINDOW_SIZE && correctCount / mathWindow.length >= MATH_RANKUP_THRESHOLD) {
              mathRank += 1;
              mathWindow = [];
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
