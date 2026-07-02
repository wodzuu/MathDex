/**
 * Battle-screen data: local types, ball/potion catalogues, and the status-move
 * effect table. Pure data + tiny pure helpers — no React.
 */

import type { PokeType } from '../../types/pokemon';
import type { MoveCategory } from '../../types/moves';
import type { Pokeballs, Potions } from '../../types/gameState';

// ── Local types ───────────────────────────────────────────────────────────────

export interface MoveSlot {
  moveId: string;
  name: string;
  type: PokeType;
  category: MoveCategory;
  power: number;
  currentPp: number;
  maxPp: number;
}

export interface DmgFloat {
  id: number;
  amount: number;
  correct: boolean;
  crit: boolean;
  /** Which combatant took the damage — controls where the number floats. */
  target: 'enemy' | 'player';
}

export interface BallOption {
  name: string;
  /** 0–1 base catch rate multiplier. Spec §5.7. */
  baseRate: number;
  /** Percentage shown in the puzzle equation (40 / 60 / 80). */
  basePercent: number;
  consumableKey: keyof Pokeballs;
}

// ── Catalogues ────────────────────────────────────────────────────────────────

export const BALLS: BallOption[] = [
  { name: 'Poké Ball',  baseRate: 0.4, basePercent: 40, consumableKey: 'pokeball'  },
  { name: 'Great Ball', baseRate: 0.6, basePercent: 60, consumableKey: 'greatBall' },
  { name: 'Ultra Ball', baseRate: 0.8, basePercent: 80, consumableKey: 'ultraBall' },
];

export const POTION_HEAL: Record<keyof Potions, number> = { potion: 20, superPotion: 60, hyperPotion: 120 };
export const POTION_LABEL: Record<keyof Potions, string> = { potion: 'Potion', superPotion: 'Super Potion', hyperPotion: 'Hyper Potion' };

// ── Status-move effects ───────────────────────────────────────────────────────
// Status moves (power 0) don't deal damage — instead they apply a battle stat
// modifier (a multiplier) to the enemy or the player that affects subsequent
// damage. Each effect persists for the rest of the battle. Spec §4 (status moves).

export type StatTarget = 'enemyAtk' | 'enemyDef' | 'playerDef';
export interface StatusEffect {
  target: StatTarget;
  /** Full multiplier applied on a correct answer (<1 = debuff enemy, >1 = buff self). */
  factor: number;
  msg: string;
}

const STATUS_EFFECTS: Record<string, StatusEffect> = {
  growl:          { target: 'enemyAtk',  factor: 0.75, msg: "Enemy's ATTACK fell!" },
  leer:           { target: 'enemyDef',  factor: 0.75, msg: "Enemy's DEFENSE fell!" },
  'tail-whip':    { target: 'enemyDef',  factor: 0.75, msg: "Enemy's DEFENSE fell!" },
  screech:        { target: 'enemyDef',  factor: 0.55, msg: "Enemy's DEFENSE sharply fell!" },
  'sand-attack':  { target: 'enemyAtk',  factor: 0.80, msg: "Enemy's accuracy dropped!" },
  smokescreen:    { target: 'enemyAtk',  factor: 0.80, msg: "Enemy's accuracy dropped!" },
  thunderwave:    { target: 'enemyAtk',  factor: 0.70, msg: 'Enemy was paralyzed!' },
  agility:        { target: 'playerDef', factor: 1.15, msg: 'Got faster — harder to hit!' },
  harden:         { target: 'playerDef', factor: 1.30, msg: 'DEFENSE rose!' },
  'defense-curl': { target: 'playerDef', factor: 1.30, msg: 'DEFENSE rose!' },
  withdraw:       { target: 'playerDef', factor: 1.30, msg: 'DEFENSE rose!' },
};

/** Effect for a status move id — defaults to a mild enemy DEFENSE drop. */
export function statusEffectFor(moveId: string): StatusEffect {
  return STATUS_EFFECTS[moveId] ?? { target: 'enemyDef', factor: 0.80, msg: "Enemy's DEFENSE fell!" };
}

/** Soften an effect toward 1 (no change) when the answer was wrong. */
export function softenFactor(factor: number, correct: boolean): number {
  return correct ? factor : 1 + (factor - 1) / 2;
}
