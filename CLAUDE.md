# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MathDex is a Pokémon-inspired dungeon-crawling RPG for ages 9–11 where every progression mechanic (attacking, catching, equipping items) is gated by solving arithmetic problems. Target platform: mobile web (max 420 px wide), installable as a PWA.

**Stack:** React 18 + Vite 5 + TypeScript 5 · React Router 6 (hash router) · Zustand 4 · Dexie 3 (IndexedDB) · vite-plugin-pwa

## Commands

```bash
npm run dev        # Start dev server (http://localhost:5173 — also exposed on LAN)
npm run build      # Type-check + production build → dist/
npm run preview    # Serve the production build locally
npm run typecheck  # Type-check only (no emit)
```

## Game Design Specification

`docs/specification.md` (v1.8) is the authoritative source for all game mechanics. Read it before implementing any game logic. Key sections:

- **§2** – Core game loop: endless wild encounters (no floors), encounter generation (party-high ±1, power-scaled by base-stat totals; 🔥 STRONG slot + 👑 ALPHA bosses), first-run trainer creation
- **§3** – Mathematics curriculum: 21 Math Ranks (+, −, ×, ÷) decoupled from opponent level; fast-track + windowed rank-up; interleaved ⭐ review
- **§4** – Battle system: damage formula, multi-challenge puzzles with a 50% damage floor, speed-based turn order, incremental damage-proportional EXP, Focus/charged crit, full-screen outcome summary
- **§5** – Item system (Phase 2, level-gated: activation trigger, rarity tiers, per-Pokémon slot progression — designed, not yet built)
- **§6** – Pokémon system: rarity tiers (from capture rate), rarity-weighted encounters + pity, types, evolution, catching, party/PC Box (incl. swap)
- **§7** – Progression & economy (money on defeat only), trainers & the Trainer view (create/switch/rename/delete)
- **§11** – Technical implementation notes (math generation, save-state schema)

## Project Structure

```
src/
  types/          Core TypeScript interfaces — import from 'src/types' (barrel index.ts)
  styles/
    tokens.ts     D palette, TYPE_COLORS, STAT_COLORS, RARITY_COLORS, font constants
    animations.ts Global keyframes + utility CSS classes; useGlobalAnimations() hook
  store/
    gameStore.ts    Zustand: trainers (create/switch/rename/delete), party/box, economy, math rank, stats
    battleStore.ts  Zustand: minimal battle state that survives navigation (enemy, HP%, active id, openingResolved)
    dungeonStore.ts Zustand: the three rolled wild encounters + active selection
    pwaStore.ts     Zustand: PWA update prompt state
  db/
    db.ts         Dexie schema (single `saves` table, one GameState row, id=1) + load/save/clear helpers
  hooks/
    useGameInit.ts    Load-or-create save on boot + debounced autosave subscription
    usePartyDisplay.ts Derived display data for party/box cards
  lib/
    formulas.ts   Pure functions: calcDamage, calcAllStats, expGained, itemSlotCount, totalPotions/totalBalls, …
    battleMath.ts playerMoveDamage / enemyMoveDamage — the single code path for battle damage numbers
    mathProblemGenerator.ts  GEN config table (one entry per Math Rank genLevel) + generateRankedPuzzle
    encounterGenerator.ts    Stage-gated, rarity-weighted, BST-power-scaled rolls with pity + tier helpers
    newGame.ts    makeTrainer(name, starterId) + createNewGame() (empty — no trainer until created)
    assets.ts     asset(path) — BASE_URL + cache-busting ?v=<build> for public/ images
    sprites.ts    Sprite URL helpers (idle/walk/ball/item)
  router/
    index.tsx     createHashRouter; gameplay routes wrapped in <TrainerGuard> (redirects to /new-trainer)
  screens/        One file or directory per route. Directory screens (Battle/, Dungeon/, Town/,
                  Pokedex/, PokemonDetail/, TrainerDetail/) pair index.tsx with a CSS module.
    Battle/       index.tsx (orchestrator) · useChallengeQueue.ts (multi-challenge state machine)
                  · panels.tsx (MoveList/Math/Potion/Ball/Catch) · battleData.ts (types + catalogues)
  components/
    TrainerGuard.tsx, PartyMemberCard.tsx, RarityBadge.tsx, PwaUpdater.tsx
    ui/           Shared presentational atoms: TypeBadge, ScreenBackdrop
  data/           Static game data: pokemon.json + gen1.ts (all 151), species.ts, moves.ts, curriculum.ts
  App.tsx         useGlobalAnimations() + useGameInit() gate, mounts AppRouter — keep thin
  main.tsx        createRoot entry point

public/           Backdrops (.jpg), sprites, PWA icons
```

## Critical Game Logic

### Math Rank progression (spec §3)

`MATH_RANKS` in `src/data/curriculum.ts` is the 21-rank ladder; each rank's `genLevel` indexes the `GEN` config table in `mathProblemGenerator.ts`. Rank-up happens in `gameStore.recordMathAttempt`:
- **Fast-track:** ≤ `MATH_FASTTRACK_MAX_MISTAKES` (2) wrong in the first `MATH_FASTTRACK_SIZE` (20) challenges of a rank → immediate rank-up.
- **Window:** otherwise ≥ 80% correct over the last 100 current-rank challenges.
- ⭐ review challenges (~30%, drawn from lower ranks) never count toward rank-up.

### Multi-challenge battle math (spec §4.3)

Picking a move queues `N = ceil(min(1, DMG/enemyMaxHP) × 5)` puzzles (`useChallengeQueue` in `screens/Battle/`). No ✅/❌ feedback until all are answered; then a "Deal N damage" button applies `max(50% DMG, DMG − wrong × round(50% DMG / N))`. Catch attempts are a single puzzle with 75% accuracy on a wrong/expired answer.

### Damage formula

```
Damage = (MovePower + ItemBonus) × Atk ÷ Def × TypeMultiplier × STAB × Crit × Accuracy ÷ 50
```

`ItemBonus = 0` until the item system exists. Always go through `playerMoveDamage()` / `enemyMoveDamage()` in `src/lib/battleMath.ts` so the move-list preview, the actual hit, and the enemy damage range can't drift apart. Spec §4.2.

### EXP is incremental and damage-proportional (spec §4.7)

EXP is granted the instant damage lands, to the Pokémon that dealt it, proportional to the HP fraction removed — persisted immediately (kept even if the enemy is later caught). There is no participant set and no end-of-battle split.

### Two-phase item system (spec §5 — designed, not yet built)

`isItemSystemActive(trainer)` is **derived** (any owned Pokémon ≥ level 20), never stored. Before activation the item system must be completely invisible — no placeholders, no locked icons. `itemSlotCount(level)` in `formulas.ts`: 0 / 1 / 2 / 3 slots at levels 1 / 20 / 36 / 50.

### Trainers

A save holds multiple trainers; a fresh save has **none** — `TrainerGuard` redirects to `/new-trainer` until the first is created (name + one of four starters). Party size (1–4) is derived from the strongest owned Pokémon's level via `partySlotsForLevel`, never stored.

## State Management

Four Zustand stores with Redux DevTools enabled:

- **`useGameStore`** — persistent world state (trainers, Pokémon, economy, math rank, stats). `useGameInit` autosaves it to Dexie (debounced) on every change.
- **`useBattleStore`** — transient battle state, deliberately minimal: only what must survive client-side navigation (enemy, enemy HP%, active fighter id, `openingResolved`). Everything else (panels, puzzles, timers, floats, focus) is BattleScreen component state. `battle` is `null` outside an encounter.
- **`useDungeonStore`** — the current three wild-encounter rolls.
- **`usePwaStore`** — service-worker update prompt.

Save/load is `src/db/db.ts`: a single `saves` table holding one `GameState` row (id = 1).

## Styling Conventions

- Two font families: `FONT_PIXEL` (`'Press Start 2P'`) for labels/numbers, `FONT_UI` (`'Nunito'`) for body/buttons — constants in `tokens.ts`. Colours come from `D` / `typeColors()` in `tokens.ts` (`typeColors` falls back to Normal for unknown strings).
- Animation classes (`.fade-up`, `.pulsing`, …) are injected once by `useGlobalAnimations()` and referenced as `className` strings.
- Screens are split between inline styles and CSS modules. **Prefer a directory + CSS module for new screens** (the Dungeon/Town/TrainerDetail pattern); shared atoms go in `src/components/ui/`.
- Full-screen painted backdrops use `<ScreenBackdrop src scrim />` from `components/ui`.

## Reference Mockups

`reference/` holds standalone React prototypes (paste into CodeSandbox/StackBlitz to preview) from the original design phase — useful for visual intent, but the production code has since diverged (e.g. they predate CSS modules and the floor-less dungeon). Treat them as historical, not authoritative.
