---
name: project-state
description: Current implementation status of MathDex — which screens are done, which are stubs, and what the next logical tasks are
metadata:
  type: project
---

## Implemented and working

**Core infrastructure**
- Zustand stores: `gameStore` (party, economy, floor progress, consumables, addCaughtPokemon) + `battleStore` (full battle state machine)
- Dexie save/load schema in `db.ts`
- `newGame.ts` — fresh save with Pikachu Lv5, ₽500, 3 Potions, 5 Poké Balls, floor block 1–5 unlocked

**Data layer**
- `src/data/species.ts` — full species roster (Pikachu, Charmander line, Squirtle line, Bulbasaur, Rattata, Meowth, Geodude line, Oddish, Magikarp/Gyarados, Voltorb, Clefairy, Jigglypuff, Eevee, etc.)
- `src/data/moves.ts` — 55 move definitions covering all learnset moveIds
- `src/lib/formulas.ts` — calcDamage, calcAllStats, calcHp, expGained, catchProbability, battleTimerSeconds, itemSlotCount, etc.
- `src/lib/mathProblemGenerator.ts` — floor-keyed puzzle generator (addition→multiplication→division→order-of-ops); `generateBattlePuzzle`, `generateCatchPuzzle` (inline in BattleScreen), `effectiveMultiplier`, `getTypeMultiplier`
- `src/lib/floorGenerator.ts` — procedural dungeon floor generation

**Screens**
- `/` Town hub — heal, Pokémart stub, Oak's Lab (locked until Lv20), PC Terminal, Dungeon Entrance
- `/dungeon` — encounter stream, Fight! navigates to /battle, victory/caught returns from battle
- `/battle` — full battle screen: arena, action panel, move select (real moves from store), math puzzle (curriculum-correct per floor), timer, focus pips, catch flow with ball panel + catch math puzzle + caught/escaped result, flee
- `/pc` — PC Terminal: party list with deposit, PC Box with withdraw, empty-slot display
- `/identify` — stub (IdentifyScreen.tsx TODO)
- `/equip` — stub (EquipScreen.tsx TODO)

**Battle flow**
- Dungeon Fight! → `battleStore.startBattle(enemy, leadUid)` → `/battle`
- BattleScreen reads real enemy/player data from stores; falls back to demo mode when no battle active
- Victory → `endBattle()` → `/dungeon` with `state.battleOutcome = 'victory'`
- Caught → `addCaughtPokemon()` → `endBattle()` → `/dungeon` with `state.battleOutcome = 'caught'`
- Fled → `endBattle()` → `/dungeon` with `state.battleOutcome = 'fled'`

**Catch math puzzle**
- Ball panel shows HP zone (green/orange/red) with contextual label
- Equation: `{ballPercent} + {hpBonus} = ?` where hpBonus is 0/20/40 per zone
- Correct answer → full catch probability; wrong → ×0.75
- Uses `catchProbability(speciesCatchRate, ballBaseRate, enemyHpPct)` from formulas.ts

## Not yet implemented

- Pokémart (buy potions/balls) — Town button is a stub
- EXP gain / level-up after battle victory
- PP restoration at Pokémon Center (heal restores HP only, not PP)
- Item system (Oak's Lab identify, Equip screen) — gated behind Lv20
- Victory screen in dungeon should show EXP gains (currently just shows "VICTORY!")
- Enemy attacks after flee (flee just navigates, no counter-attack)
- Blackout (all party fainted) flow
- Switching Pokémon during battle
- Boss floor rewards (boss floor unlocks next block but no celebratory screen)
- Save persistence to Dexie (stores hold state in memory only between sessions)

**Why:** Focus has been on the core battle + math loop. Economy, persistence, and secondary screens come next.
**How to apply:** When implementing a new feature, check this list — don't duplicate what's done or redo what's deliberately left as a stub.
