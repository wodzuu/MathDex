# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MathDex is a Pokémon-inspired dungeon-crawling RPG for ages 9–11 where every progression mechanic (attacking, catching, equipping items) is gated by solving arithmetic problems. Target platform: mobile web (max 420 px wide), installable as a PWA.

**Stack:** React 18 + Vite 5 + TypeScript 5 · React Router 6 · Zustand 4 · Dexie 3 (IndexedDB) · vite-plugin-pwa

## Commands

```bash
npm run dev        # Start dev server (http://localhost:5173 — also exposed on LAN)
npm run build      # Type-check + production build → dist/
npm run preview    # Serve the production build locally
npm run typecheck  # Type-check only (no emit)
```

## Game Design Specification

`docs/specification.md` (v1.4) is the authoritative source for all game mechanics. Read it before implementing any game logic. (v1.4 supersedes the earlier floor-based design: floors are removed and progression is level-based — see the changelog at the top of the spec.) Key sections:

- **§2** – Core game loop: endless wild encounters (no floors), encounter generation (opponent level = party-high ±1), the Lead Pokémon
- **§3** – Mathematics curriculum: addition only, re-tuned by opponent level
- **§4** – Battle system: damage formula, speed-based turn order, incremental damage-proportional EXP, Focus/charged crit
- **§6** – Pokémon system: rarity tiers (from capture rate), rarity-weighted encounters, types, evolution, catching
- **§5** – Item system (Phase 2, level-gated: activation trigger, rarity tiers, per-Pokémon slot progression)
- **§7** – Progression & economy (money on defeat only, Trainer Card)
- **§11** – Technical implementation notes (`itemSystemActive` derivation, math problem generation, save-state schema)

## Project Structure

```
src/
  types/          Core TypeScript interfaces — import from 'src/types' (barrel index.ts)
  styles/
    tokens.ts     D palette, TYPE_COLORS, STAT_COLORS, RARITY_COLORS, font constants
    animations.ts Global keyframes + utility CSS classes; useGlobalAnimations() hook
  store/
    gameStore.ts  Zustand: item system gate, party, economy, trainer card/stats
    battleStore.ts Zustand: full battle state machine (phase, enemy, focus meter, floats)
  db/
    db.ts         Dexie schema + persistSave() / loadSave() / clearSave() helpers
  lib/
    formulas.ts   Pure functions: calcDamage, calcAllStats, expGained, itemSlotCount, …
  router/
    index.tsx     createBrowserRouter with all 5 routes
  screens/        One file per top-level route (Town, Dungeon, Battle, Identify, Equip)
  components/
    ui/           Shared presentational atoms: TypeBadge, RarityBadge, HPBar, Card, Btn
  data/           Static game data: species.ts, moves.ts, items.ts, typeChart.ts, curriculum.ts
  assets/         Static assets (sprites, sounds — not present yet)
  App.tsx         Calls useGlobalAnimations(), mounts AppRouter — keep thin
  main.tsx        createRoot entry point

public/
  favicon.svg
  pwa-192x192.png  (add before production build — not in repo)
  pwa-512x512.png  (add before production build — not in repo)
```

## Architecture of the Reference Mockups

The files in `reference/` are standalone React prototypes — paste into CodeSandbox/StackBlitz to preview. They have no build system; all styles are inline.

### Shared patterns (carry into production code)

- **All styling is inline.** No CSS files, no CSS-in-JS libraries. Styles are written as JS objects passed to `style={}`. Import colours from `src/styles/tokens.ts`.
- **CSS animation classes** (`.fade-up`, `.slide-up`, `.pulsing`, `.glowY`) are injected once by `useGlobalAnimations()` in App.tsx and referenced as `className` strings.
- **Two font families:** `FONT_PIXEL` (`'Press Start 2P'`) for labels/numbers, `FONT_UI` (`'Nunito'`) for body/buttons — both constants live in `tokens.ts`.
- **Type colours:** `typeColors(type)` from `tokens.ts` returns `{ bg, fg, bdr }` for any `PokeType`. Falls back to Normal for unknown strings.

### Screen-level architecture

- **`mathdex_mockups.jsx`** — all five screens in one file, with a tab nav bar. Contains the shared `TypeBadge`, `RarityBadge`, `HPBar`, `Card`, `Btn` components to port to `src/components/ui/`.
- **`mathdex_dungeon.jsx`** — floor path, party HP top bar (Lead Pokémon larger + `LEAD` badge), bottom-sheet overlays for Encounter / Chest / Stairs / Loot Drop.
- **`mathdex_equip.jsx`** — party list → Pokémon detail (two-screen nav), item browser bottom sheet with live stat preview delta.

## Critical Game Logic

### Two-phase item system

The single most important architectural constraint. `itemSystemActive` in `gameStore` is set when **any** party Pokémon first reaches level 20. Once true it never resets.

Before activation: item slots, wild Pokémon drops, the identification screen, the equip screen, and Prof. Oak's lab **must be completely invisible** — no placeholders, no locked icons. Spec §5.0.

`gameStore.updatePokemon()` automatically fires `activateItemSystem()` when a level-20 threshold is crossed, so callers don't need to check manually.

### Damage formula

```
Damage = (MovePower + ItemBonus) × Atk ÷ Def × TypeMultiplier × STAB ÷ 50
```

`ItemBonus = 0` when `itemSystemActive` is false. Call `calcDamage()` from `src/lib/formulas.ts`. Spec §4.2.

### Item slot progression (per Pokémon, not global)

| Level | Slots |
|-------|-------|
| 1–19  | 0     |
| 20–35 | 1 (first Pokémon to reach 20 triggers global activation) |
| 36–49 | 2     |
| 50+   | 3     |

`itemSlotCount(level)` in `src/lib/formulas.ts`. `updatePokemon()` resizes `heldItemUids` automatically on level change. Spec §5.6.

### XP participation rule

Every Pokémon **sent out** during a battle receives the **full** EXP (not split). Pokémon that stayed in reserve receive nothing. `battleStore.participantUids` tracks who was sent out. `switchActive()` adds the incoming Pokémon to that set. Spec §4.7.

### Math partial credit

- Battle: wrong/expired answer → 75% power (`partialCreditMultiplier` from `DifficultyConfig`). Never 0. Spec §3.3.
- Identification: wrong answer → ≈60% of the stat value unlocked. `solvedPuzzles[i] = false` in `BagItem`. Spec §5.4.

## State Management

Two Zustand stores with Redux DevTools enabled:

- **`useGameStore`** — persistent world state (everything that should survive between dungeon runs). Saved to Dexie via `persistSave()` on every room transition and on town return.
- **`useBattleStore`** — transient battle state. `battle` is `null` outside of an encounter. `endBattle()` clears it completely.

Save/load is handled by `src/db/db.ts`. The Dexie schema has three tables: `pokemon` (indexed by `inParty`, `partySlot`), `bag` (indexed by `identified`), and `save` (single row, id=1).
