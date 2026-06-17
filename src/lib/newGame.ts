import type { GameState, Trainer, OwnedPokemon } from '../types/gameState';
import { expToLevel, calcHp } from './formulas';
import { EMPTY_PITY } from './encounterGenerator';
import { getSpecies } from '../data/species';

export function createNewGame(): GameState {
  const species = getSpecies('pikachu');
  if (!species) throw new Error('[newGame] pikachu not found in species data');

  const startLevel = 1;
  const startExp   = expToLevel(startLevel);
  const maxHp      = calcHp(species.baseStats.hp, startLevel);

  const pikachu: OwnedPokemon = {
    instanceId: crypto.randomUUID(),
    speciesId:  'pikachu',
    totalExp:   startExp,
    currentHp:  maxHp,
    moves: [
      { moveId: 'thundershock', currentPp: 30 },
      { moveId: 'growl',        currentPp: 40 },
    ],
  };

  const trainer: Trainer = {
    id:            crypto.randomUUID(),
    name:          'Ash',
    caughtPokemon:  [pikachu],
    party:          [pikachu.instanceId],
    leadInstanceId: pikachu.instanceId,
    maxPartySize:   2,
    pokeDollars:   500,
    pokeballs:     { pokeball: 5, greatBall: 0, ultraBall: 0 },
    // (no floors — difficulty scales with opponent level)
    potions:       { potion: 3, superPotion: 0, hyperPotion: 0 },
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

  return {
    version:         1,
    activeTrainerId: trainer.id,
    trainers:        [trainer],
    settings:        {},
  };
}
