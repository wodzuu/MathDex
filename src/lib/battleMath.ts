/**
 * Battle damage helpers shared by everything that must agree on a move's
 * damage: the move-list preview, the actual attack (which also sizes the
 * multi-challenge count), and the opponent-card damage range. Keeping them on
 * one code path guarantees the numbers the player sees match the hits that land.
 */

import type { PokeType } from '../types/pokemon';
import type { MoveCategory } from '../types/moves';
import { getMove } from '../data/moves';
import { calcDamage } from './formulas';
import { effectiveMultiplier } from './mathProblemGenerator';

/** Status moves (power 0) still chip the opponent with this fixed power. */
export const STATUS_CHIP_POWER = 20;

/** Minimal stat shape the damage helpers need. */
export interface CombatantStats { attack: number; defense: number; spAtk: number; spDef: number }

/**
 * Full-accuracy damage of one of the player's moves against the enemy,
 * including STAB, type effectiveness, any enemy DEFENSE debuff from status
 * moves, and (optionally) a charged crit.
 */
export function playerMoveDamage(opts: {
  power: number;
  category: MoveCategory;
  moveType: PokeType;
  attacker: CombatantStats;
  attackerTypes: readonly PokeType[];
  attackerLevel: number;
  defender: CombatantStats;
  defenderTypes: readonly PokeType[];
  /** Enemy DEFENSE multiplier accumulated from status moves (1 = none). */
  defenderDefMult?: number;
  crit?: boolean;
}): number {
  const { power, category, moveType, attacker, attackerTypes, attackerLevel, defender, defenderTypes } = opts;
  const special = category === 'special';
  return calcDamage({
    movePower:          power > 0 ? power : STATUS_CHIP_POWER,
    itemBonus:          0,
    attackerAtk:        special ? attacker.spAtk : attacker.attack,
    defenderDef:        Math.max(1, (special ? defender.spDef : defender.defense) * (opts.defenderDefMult ?? 1)),
    attackerLevel,
    typeMultiplier:     effectiveMultiplier(moveType, defenderTypes) as 0 | 0.5 | 1 | 2,
    stabMultiplier:     attackerTypes.some((t) => t === moveType) ? 1.5 : 1,
    critMultiplier:     opts.crit ? 2 : 1,
    accuracyMultiplier: 1,
  });
}

/**
 * Damage one of the enemy's moves would deal to the active player Pokémon
 * (Accuracy = 1, no crit). Status moves (power 0) use the same fixed chip as
 * the player's. Shared by the enemy's attack and the opponent-card range
 * indicator so the shown range matches the hits that land.
 */
export function enemyMoveDamage(
  moveId: string,
  enemyS: CombatantStats,
  playerS: CombatantStats,
  enemyTypes: readonly PokeType[],
  playerTypes: readonly PokeType[],
  level: number,
  enemyAtkMult: number,
  playerDefMult: number,
): number {
  const mv      = getMove(moveId);
  const power   = mv ? (mv.power > 0 ? mv.power : STATUS_CHIP_POWER) : 40;
  const special = mv?.category === 'special';
  const type    = mv?.type;
  const mult    = (type ? effectiveMultiplier(type, playerTypes) : 1) as 0 | 0.5 | 1 | 2;
  const stab: 1 | 1.5 = type && enemyTypes.some((t) => t === type) ? 1.5 : 1;
  return calcDamage({
    movePower:          power,
    itemBonus:          0,
    attackerAtk:        Math.max(1, (special ? enemyS.spAtk : enemyS.attack) * enemyAtkMult),
    defenderDef:        Math.max(1, (special ? playerS.spDef : playerS.defense) * playerDefMult),
    attackerLevel:      level,
    typeMultiplier:     mult,
    stabMultiplier:     stab,
    critMultiplier:     1,
    accuracyMultiplier: 1,
  });
}
