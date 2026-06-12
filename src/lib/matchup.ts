/**
 * Pre-battle matchup helpers for the dungeon VS screen.
 *
 * Computes the damage range (min/max across a Pokémon's moveset) one side would
 * deal to the other, mirroring the engine's calcDamage (Accuracy = 1, no crit;
 * status moves use a small fixed chip). Lets the player compare matchups before
 * committing to a fight.
 */

import { calcAllStats, calcDamage } from './formulas';
import { effectiveMultiplier } from './mathProblemGenerator';
import { getSpecies } from '../data/species';
import { getMove } from '../data/moves';

const STATUS_CHIP_POWER = 20;

/** Move ids a wild Pokémon of this species/level would know (learnset, last 4). */
export function wildMoveIds(speciesId: string, level: number): string[] {
  const sp = getSpecies(speciesId);
  if (!sp) return [];
  return sp.learnset.filter((lm) => lm.level <= level).slice(-4).map((lm) => lm.moveId);
}

/** One move's damage from attacker → defender (Accuracy 1, no crit). */
function oneMoveDamage(
  moveId: string,
  atkSpeciesId: string, atkLevel: number,
  defSpeciesId: string, defLevel: number,
): number {
  const aSpec = getSpecies(atkSpeciesId);
  const dSpec = getSpecies(defSpeciesId);
  if (!aSpec || !dSpec) return 0;
  const aStats = calcAllStats(aSpec.baseStats, atkLevel);
  const dStats = calcAllStats(dSpec.baseStats, defLevel);
  const mv      = getMove(moveId);
  const power   = mv ? (mv.power > 0 ? mv.power : STATUS_CHIP_POWER) : 40;
  const special = mv?.category === 'special';
  const type    = mv?.type;
  const mult    = (type ? effectiveMultiplier(type, dSpec.types) : 1) as 0 | 0.5 | 1 | 2;
  const stab: 1 | 1.5 = type && aSpec.types.some((t) => t === type) ? 1.5 : 1;
  return calcDamage({
    movePower:          power,
    itemBonus:          0,
    attackerAtk:        special ? aStats.spAtk : aStats.attack,
    defenderDef:        special ? dStats.spDef : dStats.defense,
    attackerLevel:      atkLevel,
    typeMultiplier:     mult,
    stabMultiplier:     stab,
    critMultiplier:     1,
    accuracyMultiplier: 1,
  });
}

export interface Fighter {
  speciesId: string;
  level: number;
  moveIds: string[];
}

/** Min/max damage the attacker's moveset would deal to the defender. */
export function damageRange(attacker: Fighter, defender: Fighter): { min: number; max: number } {
  if (!attacker.moveIds.length) return { min: 0, max: 0 };
  const dmgs = attacker.moveIds.map((id) =>
    oneMoveDamage(id, attacker.speciesId, attacker.level, defender.speciesId, defender.level),
  );
  return { min: Math.min(...dmgs), max: Math.max(...dmgs) };
}
