import { useMemo } from 'react';
import type { OwnedPokemon } from '../types/gameState';
import type { PokeType } from '../types/pokemon';
import { getSpecies } from '../data/species';
import { calcAllStats, calcHp, levelFromExp, expToLevel } from '../lib/formulas';

export interface PartyDisplayPokemon {
  instanceId: string;
  name:       string;
  dexNumber:  number;
  type:       PokeType;
  level:      number;
  // HP
  currentHp:  number;
  maxHp:      number;
  hpPct:      number;
  // EXP
  expBarPct:  number;   // 0–100 progress within the current level
  expToNext:  number;   // EXP remaining to next level (0 if at cap edge)
  // Stats
  attack:     number;
  defense:    number;
  speed:      number;
}

export function usePartyDisplay(party: string[], caughtPokemon: OwnedPokemon[]): PartyDisplayPokemon[] {
  return useMemo(() =>
    party
      .map((id) => {
        const pk = caughtPokemon.find(p => p.instanceId === id);
        if (!pk) return null;
        const species = getSpecies(pk.speciesId);
        const level   = levelFromExp(pk.totalExp);

        const stats   = species ? calcAllStats(species.baseStats, level) : null;
        const maxHp   = species ? calcHp(species.baseStats.hp, level) : pk.currentHp;
        const currentHp = Math.max(0, Math.min(maxHp, pk.currentHp));

        const lvlFloor  = expToLevel(level);
        const lvlCeil   = expToLevel(level + 1);
        const range     = lvlCeil - lvlFloor;
        const progress  = pk.totalExp - lvlFloor;

        return {
          instanceId: pk.instanceId,
          name:       species?.name ?? pk.speciesId,
          dexNumber:  species?.dexNumber ?? 0,
          type:       (species?.types[0] ?? 'Normal') as PokeType,
          level,
          currentHp,
          maxHp,
          hpPct:      maxHp > 0 ? Math.min(100, Math.max(0, Math.round((currentHp / maxHp) * 100))) : 0,
          expBarPct:  range > 0 ? Math.max(0, Math.min(100, Math.round((progress / range) * 100))) : 0,
          expToNext:  Math.max(0, lvlCeil - pk.totalExp),
          attack:     stats?.attack  ?? 0,
          defense:    stats?.defense ?? 0,
          speed:      stats?.speed   ?? 0,
        };
      })
      .filter((p): p is PartyDisplayPokemon => p !== null),
    [party, caughtPokemon],
  );
}
