import type { MathTopic } from './math';

export interface GameState {
  version: number;
  activeTrainerId: string;
  trainers: Trainer[];
  settings: Settings;
}

export interface Settings {}

export interface Trainer {
  id: string;
  name: string;
  caughtPokemon: OwnedPokemon[];
  /** Ordered instanceIds. Order is stable; the lead is tracked separately. */
  party: string[];
  /** instanceId of the active fighter. Falls back to party[0] if unset/invalid. */
  leadInstanceId?: string;
  /** 2–6; grows as boss floors are cleared. */
  maxPartySize: number;
  pokeDollars: number;
  pokeballs: Pokeballs;
  potions: Potions;
  stats: TrainerStats;
}

export interface Pokeballs {
  pokeball: number;
  greatBall: number;
  ultraBall: number;
}

export interface Potions {
  potion: number;
  superPotion: number;
  hyperPotion: number;
}

export interface OwnedPokemon {
  instanceId: string;
  speciesId: string;
  /** Cumulative EXP; level = Math.floor(Math.cbrt(totalExp)). */
  totalExp: number;
  currentHp: number;
  moves: OwnedMove[];
}

export interface OwnedMove {
  moveId: string;
  currentPp: number;
}

export interface TrainerStats {
  totalProblemsAttempted: number;
  totalProblemsSolved: number;
  currentStreak: number;
  longestStreak: number;
  totalBattles: number;
  totalCatches: number;
  /** Highest level of any wild Pokémon the player has encountered. */
  highestOpponentLevel: number;
  topicAccuracy: Partial<Record<MathTopic, TopicStats>>;
}

export interface TopicStats {
  attempted: number;
  correct: number;
}
