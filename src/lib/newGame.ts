import type { GameState, Trainer, OwnedPokemon } from '../types/gameState';
import type { PokemonSpecies } from '../types/pokemon';
import { expToLevel, calcHp } from './formulas';
import { EMPTY_PITY } from './encounterGenerator';
import { getSpecies } from '../data/species';
import { getMove } from '../data/moves';

const STARTER_LEVEL = 1;

/** The four choosable starter species (by id), in display order. */
export const STARTER_IDS = ['pikachu', 'bulbasaur', 'charmander', 'squirtle'] as const;
export type StarterId = typeof STARTER_IDS[number];

/** Moves a freshly-caught starter knows: those learnt by the starting level
 *  (capped at 4), falling back to its first learnset entries so it always has
 *  something to attack with. */
function starterMoves(species: PokemonSpecies): OwnedPokemon['moves'] {
  const known  = species.learnset.filter((lm) => lm.level <= STARTER_LEVEL);
  const picked = known.length ? known.slice(-4) : species.learnset.slice(0, 2);
  return picked.map((lm) => ({ moveId: lm.moveId, currentPp: getMove(lm.moveId)?.pp ?? 20 }));
}

/** Build a brand-new trainer with the chosen name and starter Pokémon. */
export function makeTrainer(name: string, starterId: string): Trainer {
  const species = getSpecies(starterId);
  if (!species) throw new Error(`[newGame] starter not found: ${starterId}`);

  const starter: OwnedPokemon = {
    instanceId: crypto.randomUUID(),
    speciesId:  starterId,
    totalExp:   expToLevel(STARTER_LEVEL),
    currentHp:  calcHp(species.baseStats.hp, STARTER_LEVEL),
    moves:      starterMoves(species),
  };

  return {
    id:             crypto.randomUUID(),
    name:           name.trim() || 'Trainer',
    caughtPokemon:  [starter],
    party:          [starter.instanceId],
    leadInstanceId: starter.instanceId,
    pokeDollars:    500,
    pokeballs:      { pokeball: 5, greatBall: 0, ultraBall: 0 },
    potions:        { potion: 3, superPotion: 0, hyperPotion: 0 },
    stats: {
      totalProblemsAttempted: 0,
      totalProblemsSolved:    0,
      currentStreak:          0,
      longestStreak:          0,
      totalBattles:           0,
      totalCatches:           0,
      highestOpponentLevel:   0,
      topicAccuracy:          {},
    },
    focus:         0,
    mathRank:      1,
    mathWindow:    [],
    encounterPity: { ...EMPTY_PITY },
  };
}

/**
 * A brand-new game has no trainers yet — the player creates their first trainer
 * (name + starter) on the New Trainer screen before the game begins.
 */
export function createNewGame(): GameState {
  return { version: 1, activeTrainerId: '', trainers: [], settings: {} };
}
