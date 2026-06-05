import { useMemo } from 'react';
import type { OwnedPokemon } from '../types/gameState';
import type { PokeType } from '../types/pokemon';
import { getSpecies } from '../data/species';
import { calcHp, levelFromExp } from '../lib/formulas';

export interface PartyDisplayPokemon {
  instanceId: string;
  name:       string;
  dexNumber:  number;
  type:       PokeType;
  level:      number;
  hpPct:      number;
  isLead:     boolean;
}

export function usePartyDisplay(party: string[], caughtPokemon: OwnedPokemon[]): PartyDisplayPokemon[] {
  return useMemo(() =>
    party
      .map((id, idx) => {
        const pk = caughtPokemon.find(p => p.instanceId === id);
        if (!pk) return null;
        const species = getSpecies(pk.speciesId);
        const level   = levelFromExp(pk.totalExp);
        const maxHp   = species ? calcHp(species.baseStats.hp, level) : pk.currentHp;
        return {
          instanceId: pk.instanceId,
          name:       species?.name ?? pk.speciesId,
          dexNumber:  species?.dexNumber ?? 0,
          type:       (species?.types[0] ?? 'Normal') as PokeType,
          level,
          hpPct:      maxHp > 0 ? Math.min(100, Math.max(0, Math.round((pk.currentHp / maxHp) * 100))) : 0,
          isLead:     idx === 0,
        };
      })
      .filter((p): p is PartyDisplayPokemon => p !== null),
    [party, caughtPokemon],
  );
}
