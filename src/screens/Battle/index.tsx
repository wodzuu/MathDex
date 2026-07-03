/**
 * Battle screen — turn-based wild encounter (spec §4).
 *
 * Layout: opponent + player panels over the arena, the trainer Focus strip,
 * then the contextual bottom panel (move list / math challenges / potion /
 * ball / catch — see panels.tsx). The multi-challenge math machinery lives in
 * useChallengeQueue; damage helpers in lib/battleMath. This file orchestrates:
 * turn flow, switching, HP persistence, EXP, catch resolution, and navigation
 * to the outcome summary.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import type { PokeType } from '../../types/pokemon';
import type { MathPuzzle, MathTopic } from '../../types/math';
import type { Potions } from '../../types/gameState';
import { typeColors } from '../../styles/tokens';
import { getMove } from '../../data/moves';
import { getSpecies } from '../../data/species';
import { calcHp, calcAllStats, catchProbability, expGained, levelFromExp, expToLevel, moneyReward, totalPotions, totalBalls } from '../../lib/formulas';
import { playerMoveDamage, enemyMoveDamage } from '../../lib/battleMath';
import { getIdleSpriteUrl, getBallSpriteUrl } from '../../lib/sprites';
import { asset } from '../../lib/assets';
import { generateRankedPuzzle, effectiveMultiplier, getTypeMultiplier } from '../../lib/mathProblemGenerator';
import { useBattleStore } from '../../store/battleStore';
import { useGameStore, useActiveTrainer, getPartyPokemon } from '../../store/gameStore';
import { statusEffectFor, softenFactor, POTION_HEAL, POTION_LABEL, type MoveSlot, type DmgFloat, type BallOption } from './battleData';
import { useChallengeQueue } from './useChallengeQueue';
import { MoveList, MathPanel, PotionPanel, BallPanel, CatchPanel, type SortedMove } from './panels';
import b from './Battle.module.css';

// Painted forest-clearing backdrop for the whole battle screen.
const BATTLE_URL = asset('battle.jpg');
// Impact "poof" shown over a Pokémon while it's taking damage.
const HIT_URL = asset('misc/hit.png');
// Trainer portrait — a small badge on "my" Pokémon's panel.
const TRAINER_IMG = asset('trainer.png');

type Panel = 'moves' | 'math' | 'potion' | 'ball' | 'catch';

/** HP bar with a pale "damage ghost" that lingers at the old value and drains
 *  after the real fill drops — makes every hit visibly bite. */
function HpBar({ pct, color }: { pct: number; color: string }) {
  const [ghost, setGhost] = useState(pct);
  useEffect(() => {
    const t = setTimeout(() => setGhost(pct), 250);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className={b.hpTrack}>
      {/* Stays mounted so its width transition can play: holds the old value
          for a beat, then drains down to meet the real fill. */}
      <div className={b.hpGhost} style={{ width: `${Math.max(ghost, pct)}%` }} />
      <div className={b.hpFill} style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** Phases of the Poké Ball throw animation (catch suspense). */
type CatchPhase = null | 'fly' | 'wobble' | 'caught';

export default function BattleScreen() {
  const navigate = useNavigate();

  // ── Store reads ─────────────────────────────────────────────────────────────
  const battle    = useBattleStore((s) => s.battle);
  const endBattle = useBattleStore((s) => s.endBattle);
  const markOpeningResolved = useBattleStore((s) => s.markOpeningResolved);

  const trainer = useActiveTrainer();
  const { addCaughtPokemon, adjustPotions, adjustPokeballs, recordMathAttempt, updatePokemon, setFocus } = useGameStore(
    useShallow((gs) => ({
      addCaughtPokemon:   gs.addCaughtPokemon,
      adjustPotions:      gs.adjustPotions,
      adjustPokeballs:    gs.adjustPokeballs,
      recordMathAttempt:  gs.recordMathAttempt,
      updatePokemon:      gs.updatePokemon,
      setFocus:           gs.setFocus,
    }))
  );

  const party = getPartyPokemon(trainer);

  // Math Rank drives puzzle difficulty but is hidden from the player — it just happens.
  const mathRank = trainer.mathRank ?? 1;

  // ── Derive active context ────────────────────────────────────────────────────
  // The screen renders nothing (and redirects) without a battle, so the
  // fallbacks below only keep the hook body type-safe on that first frame.
  const playerPokemon  = party.find((p) => p.instanceId === battle?.activePlayerInstanceId) ?? null;
  const playerSpecies  = playerPokemon ? getSpecies(playerPokemon.speciesId) : null;
  const enemySpecies   = battle ? getSpecies(battle.enemy.speciesId) : null;

  const activeEnemyTypes  = (enemySpecies?.types  ?? ['Normal']) as readonly PokeType[];
  const activePlayerTypes = (playerSpecies?.types ?? ['Normal']) as readonly PokeType[];

  // Derive level from totalExp
  const playerLevel = playerPokemon ? levelFromExp(playerPokemon.totalExp) : 1;
  const enemyLevel  = battle ? levelFromExp(battle.enemy.totalExp) : 1;

  const enemyStats  = enemySpecies  && battle       ? calcAllStats(enemySpecies.baseStats,  enemyLevel)  : null;
  const playerStats = playerSpecies && playerPokemon ? calcAllStats(playerSpecies.baseStats, playerLevel) : null;

  const enemyMaxHp  = enemyStats?.maxHp ?? null;
  const playerMaxHp = playerStats?.maxHp ?? null;

  // Turn order is decided by the Speed stat — the faster Pokémon strikes first
  // each turn. Ties go to the player. Spec §4.1.
  const playerGoesFirst = (playerStats?.speed ?? 0) >= (enemyStats?.speed ?? 0);

  // Build real move slots from the player Pokémon's moves
  const realMoves: MoveSlot[] = (playerPokemon?.moves ?? []).flatMap((lm) => {
    const m = getMove(lm.moveId);
    // OwnedMove has no maxPp; fall back to the move definition's pp
    const maxPp = m?.pp ?? 20;
    return m ? [{ moveId: lm.moveId, name: m.name, type: m.type, category: m.category, power: m.power, currentPp: lm.currentPp, maxPp }] : [];
  });

  // Initial HP percentages
  const initEnemyHp = battle?.enemyHpPercent ?? 100;
  const initPlayerHp = (() => {
    if (battle && playerPokemon && playerSpecies) {
      const maxHp = calcHp(playerSpecies.baseStats.hp, playerLevel);
      // 0 HP → exactly 0% (fainted); otherwise show at least 1% so a barely-alive
      // Pokémon never reads as fainted.
      return playerPokemon.currentHp <= 0 ? 0 : Math.min(100, Math.max(1, Math.round((playerPokemon.currentHp / maxHp) * 100)));
    }
    return 100;
  })();
  // Focus is a persisted trainer property — start the battle from the saved value.
  const initFocusPips = trainer.focus ?? 0;

  // Display info
  const playerName      = playerSpecies?.name.toUpperCase() ?? '?';
  const playerDexNumber = playerSpecies?.dexNumber ?? 0;
  const enemyName       = enemySpecies?.name.toUpperCase() ?? '?';
  const enemyDexNumber  = enemySpecies?.dexNumber ?? 0;

  // ── Component state ─────────────────────────────────────────────────────────
  const [panel, setPanel]               = useState<Panel>('moves');
  const [selectedMove, setSelectedMove] = useState<MoveSlot | null>(null);
  // Multi-challenge attack state machine (queue, answers, per-challenge timer).
  const q = useChallengeQueue();
  // Catch-math feedback ('ok'/'no' after the catch answer is submitted).
  const [result, setResult]             = useState<'ok' | 'no' | null>(null);
  const [enemyHpPct, setEnemyHpPct]     = useState(initEnemyHp);
  const [playerHpPct, setPlayerHpPct]   = useState(initPlayerHp);
  const [focusPips, setFocusPips]       = useState(initFocusPips);
  const [floats, setFloats]             = useState<DmgFloat[]>([]);
  const [potMsg, setPotMsg]             = useState<string | null>(null);
  const [statusMsg, setStatusMsg]       = useState<string | null>(null);
  // UI mirrors of the status-move stat modifiers so the Atk/Def chips visibly
  // change. The refs (below) drive the damage math; these drive the display.
  const [, setEnemyAtkMult]  = useState(1);
  const [enemyDefMult, setEnemyDefMult]  = useState(1);
  const [, setPlayerDefMult] = useState(1);
  const [potions, setPotions]           = useState({
    potion:      trainer.potions.potion,
    superPotion: trainer.potions.superPotion,
    hyperPotion: trainer.potions.hyperPotion,
  });
  // Catch flow
  const [selectedBall, setSelectedBall] = useState<BallOption | null>(null);
  const [catchPuzzle, setCatchPuzzle]   = useState<MathPuzzle | null>(null);
  const [catchResult, setCatchResult]   = useState<'caught' | 'escaped' | null>(null);
  const [catchPhase, setCatchPhase]     = useState<CatchPhase>(null);
  // Game-feel: attacker lunge + arena shake while a hit lands, and the
  // level-up / evolution banner over the player's Pokémon.
  const [playerLunge, setPlayerLunge]   = useState(false);
  const [enemyLunge, setEnemyLunge]     = useState(false);
  const [shaking, setShaking]           = useState(false);
  const [levelUpMsg, setLevelUpMsg]     = useState<string | null>(null);
  // Party carousel: switching is locked until a faster enemy's opening strike has
  // landed, so that strike always hits the Pokémon the player entered with.
  const [canSwitch, setCanSwitch]       = useState(playerGoesFirst || !!battle?.openingResolved);

  // Track enemy HP in a ref to read synchronously inside the attack resolution.
  const enemyHpRef     = useRef(initEnemyHp);
  const focusPipsRef   = useRef(initFocusPips);
  const playerHpPctRef = useRef(initPlayerHp);
  // Mid-battle party switching: mirror of the active fighter id + a per-member
  // HP% stash so each Pokémon's HP is preserved as the player flips the carousel.
  const activeIdRef = useRef(battle?.activePlayerInstanceId ?? '');
  const hpStashRef  = useRef<Record<string, number>>({});
  const seededRef   = useRef(false);
  // Guards the final damage application against re-entry: the "Deal damage"
  // button resolves the move exactly once. Reset when a new move is picked.
  const resolvedRef = useRef(false);
  // Battle stat modifiers from status moves (1 = no change). Persist for the
  // whole battle; reset naturally because a new battle remounts this screen.
  const enemyAtkMultRef  = useRef(1);
  const enemyDefMultRef  = useRef(1);
  const playerDefMultRef = useRef(1);
  // EXP is awarded incrementally as damage is dealt: each hit grants
  // (totalEnemyExp × HP-fraction-removed) to the Pokémon that dealt it. This ref
  // accumulates the per-Pokémon totals (keyed by instanceId) for the end-of-battle
  // summary. The EXP is persisted to game state immediately on every hit, so a
  // Pokémon keeps what it earned even if the enemy is later caught. Spec §4.7.
  const expAccRef = useRef<Record<string, { name: string; dexNumber: number; expAdded: number; oldLevel: number }>>({});
  // Pending level-up banner + hit-juice timeouts (overwritten per event).
  const levelUpToRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const juiceToRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { focusPipsRef.current = focusPips; }, [focusPips]);
  // Persist the Focus meter to the trainer so it survives battles + sessions.
  useEffect(() => { if (battle) setFocus(focusPips); }, [focusPips, battle, setFocus]);
  useEffect(() => { playerHpPctRef.current = playerHpPct; }, [playerHpPct]);

  // Seed the per-member HP% stash from each party Pokémon's stored HP, once.
  useEffect(() => {
    if (seededRef.current || !battle) return;
    seededRef.current = true;
    const gs = useGameStore.getState();
    const t  = gs.trainers.find((x) => x.id === gs.activeTrainerId);
    for (const id of (t?.party ?? [])) {
      const pk = t?.caughtPokemon.find((p) => p.instanceId === id);
      if (!pk) continue;
      const spec  = getSpecies(pk.speciesId);
      const maxHp = spec ? calcHp(spec.baseStats.hp, levelFromExp(pk.totalExp)) : pk.currentHp;
      hpStashRef.current[id] = (pk.currentHp <= 0 || maxHp <= 0) ? 0 : Math.min(100, Math.max(1, Math.round(pk.currentHp / maxHp * 100)));
    }
  }, [battle]);

  // Keep the active-fighter id mirror in sync as the player switches.
  useEffect(() => { if (battle) activeIdRef.current = battle.activePlayerInstanceId; }, [battle]);

  // Hit juice: the attacker lunges at its target and the arena shudders.
  const hitJuice = useCallback((attacker: 'player' | 'enemy') => {
    if (attacker === 'player') setPlayerLunge(true); else setEnemyLunge(true);
    setShaking(true);
    if (juiceToRef.current) clearTimeout(juiceToRef.current);
    juiceToRef.current = setTimeout(() => {
      setPlayerLunge(false);
      setEnemyLunge(false);
      setShaking(false);
    }, 450);
  }, []);

  // ── Incremental EXP award ────────────────────────────────────────────────────
  // Grant a slice of EXP to the currently-active Pokémon for damage it just dealt.
  // Persisted to game state immediately so the EXP bar updates live and survives a
  // later catch. Accumulated per-Pokémon in expAccRef for the post-battle summary.
  const awardExp = useCallback((expShare: number) => {
    if (expShare <= 0) return;
    const bt = useBattleStore.getState().battle;
    if (!bt) return;
    const instanceId = bt.activePlayerInstanceId;
    const store = useGameStore.getState();
    const t  = store.trainers.find((x) => x.id === store.activeTrainerId);
    const pk = t?.caughtPokemon.find((p) => p.instanceId === instanceId);
    if (!pk) return;
    const spec = getSpecies(pk.speciesId);
    const acc  = expAccRef.current[instanceId] ?? {
      name:      spec?.name ?? pk.speciesId,
      dexNumber: spec?.dexNumber ?? 0,
      expAdded:  0,
      oldLevel:  levelFromExp(pk.totalExp),
    };
    acc.expAdded += expShare;
    expAccRef.current[instanceId] = acc;
    const levelBefore = levelFromExp(pk.totalExp);
    store.updatePokemon(instanceId, { totalExp: pk.totalExp + expShare });

    // Celebrate a mid-battle level-up (or evolution — updatePokemon evolves by
    // level) the moment it happens, with a banner over the player's Pokémon.
    const after = useGameStore.getState().trainers.find((x) => x.id === store.activeTrainerId)
      ?.caughtPokemon.find((p) => p.instanceId === instanceId);
    if (after) {
      const levelAfter = levelFromExp(after.totalExp);
      if (levelAfter > levelBefore) {
        const evolved = after.speciesId !== pk.speciesId;
        const msg = evolved
          ? `🧬 EVOLVED INTO ${getSpecies(after.speciesId)?.name.toUpperCase() ?? '?'}!`
          : `⬆ LEVEL ${levelAfter}!`;
        setLevelUpMsg(msg);
        if (levelUpToRef.current) clearTimeout(levelUpToRef.current);
        levelUpToRef.current = setTimeout(() => setLevelUpMsg(null), 2000);
      }
    }
  }, []);

  // Build the end-of-battle EXP summary from everything awarded this battle,
  // reading each Pokémon's final level fresh from game state.
  const buildExpGains = useCallback(() => {
    const store = useGameStore.getState();
    const t = store.trainers.find((x) => x.id === store.activeTrainerId);
    return Object.entries(expAccRef.current).map(([instanceId, rec]) => {
      const pk = t?.caughtPokemon.find((p) => p.instanceId === instanceId);
      const newLevel = pk ? levelFromExp(pk.totalExp) : rec.oldLevel;
      // The Pokémon evolved this battle if its species name changed from the one
      // captured when EXP first accrued (updatePokemon evolves by level).
      const curSpec = pk ? getSpecies(pk.speciesId) : null;
      const evolved = !!curSpec && curSpec.name !== rec.name;
      return {
        instanceId, name: rec.name, dexNumber: rec.dexNumber,
        expAdded: rec.expAdded, oldLevel: rec.oldLevel, newLevel,
        evolvedToName: evolved ? curSpec!.name      : undefined,
        evolvedToDex:  evolved ? curSpec!.dexNumber : undefined,
      };
    });
  }, []);

  // ── Party switching + HP persistence ─────────────────────────────────────────

  // Persist every party member's battle-end HP from the stash (fainted = 0).
  const persistAllHp = useCallback(() => {
    const gs = useGameStore.getState();
    const t  = gs.trainers.find((x) => x.id === gs.activeTrainerId);
    if (!t) return;
    hpStashRef.current[activeIdRef.current] = playerHpPctRef.current;
    for (const id of t.party) {
      const pk = t.caughtPokemon.find((p) => p.instanceId === id);
      if (!pk) continue;
      const spec = getSpecies(pk.speciesId);
      if (!spec) continue;
      const maxHp = calcHp(spec.baseStats.hp, levelFromExp(pk.totalExp));
      const pct   = hpStashRef.current[id];
      if (pct === undefined) continue;
      gs.updatePokemon(id, { currentHp: Math.max(0, Math.min(maxHp, Math.round(pct / 100 * maxHp))) });
    }
  }, []);

  // First party member (other than excludeId) that still has HP. null = all fainted.
  const firstAlive = useCallback((excludeId?: string): string | null => {
    const gs = useGameStore.getState();
    const t  = gs.trainers.find((x) => x.id === gs.activeTrainerId);
    for (const id of (t?.party ?? [])) {
      if (id === excludeId) continue;
      if ((hpStashRef.current[id] ?? 0) > 0) return id;
    }
    return null;
  }, []);

  // Make `id` the active fighter (carousel switch). Free — costs no turn.
  const qRef = useRef(q);
  qRef.current = q;
  const switchTo = useCallback((id: string) => {
    const bt = useBattleStore.getState().battle;
    if (!bt || id === activeIdRef.current) return;
    hpStashRef.current[activeIdRef.current] = playerHpPctRef.current;
    useBattleStore.getState().switchActive(id);
    activeIdRef.current = id;
    const incoming = hpStashRef.current[id];
    const hp = incoming !== undefined ? incoming : 100;
    setPlayerHpPct(hp);
    playerHpPctRef.current = hp;
    setPanel('moves');
    setSelectedMove(null);
    qRef.current.clear();
  }, []);

  // ── Victory / flee navigation ───────────────────────────────────────────────

  const handleVictory = useCallback(() => {
    const currentBattle = useBattleStore.getState().battle;
    if (!currentBattle) {
      endBattle();
      navigate('/dungeon', { state: { battleOutcome: 'victory' } });
      return;
    }

    const gs = useGameStore.getState();

    // EXP was already granted incrementally per hit — here we persist every party
    // member's battle HP (fainted reserves stay fainted) and pay out Pokédollars.
    persistAllHp();

    const enemyRarityForReward = getSpecies(currentBattle.enemy.speciesId)?.rarity ?? 'Common';
    const pokeReward = moneyReward(enemyLevel, enemyRarityForReward);
    const expGains   = buildExpGains();
    const defeatedName = getSpecies(currentBattle.enemy.speciesId)?.name ?? 'Pokémon';
    gs.earnPokeDollars(pokeReward);
    endBattle();
    // Full-screen victory splash, then on to the dungeon.
    navigate('/summary', { state: { battleOutcome: 'victory', name: defeatedName, expGains, pokeReward } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endBattle, navigate, enemyLevel, buildExpGains, persistAllHp]);

  const handleFlee = useCallback(() => {
    if (useBattleStore.getState().battle) persistAllHp();
    endBattle();
    navigate('/dungeon', { state: { battleOutcome: 'fled' } });
  }, [endBattle, navigate, persistAllHp]);

  // ── Blackout — whole party fainted ───────────────────────────────────────────
  // Routes to the full-screen "fainted" summary, which returns to town on tap.
  // Everything is kept (caught Pokémon, Pokédollars); the fainted party members
  // are persisted at 0 HP, so they must be healed at the Pokémon Center.
  const handleBlackout = useCallback(() => {
    qRef.current.stopTimer();
    // Every party member has fainted — persist them all (at 0 HP).
    if (useBattleStore.getState().battle) persistAllHp();
    endBattle();
    // Full-screen "blacked out" splash; tapping it returns to town.
    navigate('/summary', { state: { battleOutcome: 'fainted' } });
  }, [endBattle, navigate, persistAllHp]);

  // ── Enemy attack ─────────────────────────────────────────────────────────────
  // The wild Pokémon strikes the player. Applies damage, shows the attribution
  // banner + float, and returns whether the player fainted. Used both for the
  // per-turn counterattack and the faster-enemy opening strike.
  const enemyAttack = useCallback((): boolean => {
    let enemyDamagePct = 5;
    if (enemyStats && playerStats && playerMaxHp) {
      // The wild Pokémon picks one of its own moves at random.
      const enemyMoves = useBattleStore.getState().battle?.enemy.moves ?? [];
      const picked = enemyMoves.length ? enemyMoves[Math.floor(Math.random() * enemyMoves.length)] : null;
      const enemyDmg = enemyMoveDamage(
        picked?.moveId ?? '',
        enemyStats, playerStats,
        enemySpecies?.types ?? [], activePlayerTypes,
        enemyLevel,
        enemyAtkMultRef.current, playerDefMultRef.current,   // status-move modifiers
      );
      enemyDamagePct = Math.max(1, Math.min(100, Math.round((enemyDmg / playerMaxHp) * 100)));
    }
    const newPlayerHp = Math.max(0, playerHpPctRef.current - enemyDamagePct);
    setPlayerHpPct(newPlayerHp);
    playerHpPctRef.current = newPlayerHp;
    hpStashRef.current[activeIdRef.current] = newPlayerHp;   // keep the stash in sync
    hitJuice('enemy');
    // Float the damage received over the player's avatar.
    const dmgAmt = playerMaxHp ? Math.max(1, Math.round(enemyDamagePct / 100 * playerMaxHp)) : enemyDamagePct;
    const pfId   = Date.now();
    setFloats((f) => [...f, { id: pfId, amount: dmgAmt, correct: false, crit: false, target: 'player' }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== pfId)), 1800);
    // Faint when the actual (rounded) HP reaches 0 — not just the percentage,
    // which can sit at ~1% while displaying 0 HP.
    const actualHp = playerMaxHp ? Math.round(newPlayerHp / 100 * playerMaxHp) : newPlayerHp;
    return actualHp <= 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemyStats, playerStats, playerMaxHp, enemyLevel, enemySpecies, activePlayerTypes, hitJuice]);

  // ── Faster-enemy opening strike ──────────────────────────────────────────────
  // When the wild Pokémon is faster it gets one free hit at the very start of the
  // battle — clearly the enemy "going first" — before the player acts. Thereafter
  // every turn is the intuitive player-attacks-then-enemy-counters loop.
  //
  // The decision is fixed to the Pokémon the player ENTERED with (captured once at
  // mount), so it does NOT change if the player later switches to a slower party
  // member — a fast lead means no one is struck by speed, even after switching.
  const enteredGoesFirstRef = useRef(playerGoesFirst);
  const openingStrikeRef = useRef(false);
  useEffect(() => {
    // Skip when the player is faster, or when the opening already happened on a
    // previous mount (e.g. we left to view a Pokédex entry and came back).
    if (!battle || enteredGoesFirstRef.current || battle.openingResolved) return;
    const t = setTimeout(() => {
      if (openingStrikeRef.current) return;   // fire exactly once (StrictMode-safe)
      openingStrikeRef.current = true;
      markOpeningResolved();
      // The strike hits the Pokémon the player entered with (switching is locked
      // until now, so the active Pokémon is still the entered one).
      if (enemyAttack()) {
        const next = firstAlive(activeIdRef.current);
        if (next) switchTo(next); else handleBlackout();
      }
      setCanSwitch(true);   // unlock the carousel now the opening strike has landed
    }, 650);
    return () => clearTimeout(t);
  }, [battle, enemyAttack, handleBlackout, firstAlive, switchTo, markOpeningResolved]);

  // Timer expiry — catch math (its own single-puzzle countdown, no auto-advance)
  useEffect(() => {
    if (q.timer > 0 || q.ready || panel !== 'catch' || catchResult !== null || catchPhase !== null) return;
    handleSubmitCatch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.timer, q.ready, panel, catchResult, catchPhase]);

  // ── Apply the resolved move ─────────────────────────────────────────────────
  // Called from the "Deal N damage" button once every challenge is answered.
  // 50% of the move's damage is guaranteed; each wrong answer forfeits an equal
  // share of the earnable half (already folded into q.finalDamage).

  function applyComputedAttack() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    q.stopTimer();

    const slot = selectedMove;
    if (!slot) return;

    const allCorrect = q.wrongCount === 0;
    const damage     = q.finalDamage;
    const isCrit     = q.isCrit;

    // Each challenge counts toward math-rank progress against its own topic.
    q.challenges.forEach((p, i) => {
      const ok = q.chAnswers[i] != null && q.chAnswers[i] === p.answer;
      recordMathAttempt(p.topic ?? ('addition' as MathTopic), ok, p.isReview ?? false);
    });

    const damagePct = enemyMaxHp
      ? Math.min(100, Math.round((damage / enemyMaxHp) * 100))
      : Math.max(0, damage);

    const performPlayerHit = (): boolean => {
      // Status move — apply its battle stat modifier; full effect only if flawless.
      if (slot.power === 0) {
        const eff    = statusEffectFor(slot.moveId);
        const factor = softenFactor(eff.factor, allCorrect);
        if (eff.target === 'enemyAtk')  { enemyAtkMultRef.current  *= factor; setEnemyAtkMult(enemyAtkMultRef.current); }
        if (eff.target === 'enemyDef')  { enemyDefMultRef.current  *= factor; setEnemyDefMult(enemyDefMultRef.current); }
        if (eff.target === 'playerDef') { playerDefMultRef.current *= factor; setPlayerDefMult(playerDefMultRef.current); }
        setStatusMsg(allCorrect ? eff.msg : `${eff.msg} (weak)`);
        setTimeout(() => setStatusMsg(null), 1400);
      }

      const oldEnemyHp = enemyHpRef.current;
      const newEnemyHp = Math.max(0, oldEnemyHp - damagePct);
      if (damagePct > 0) {
        setEnemyHpPct(newEnemyHp);
        enemyHpRef.current = newEnemyHp;
      }

      const hpFractionRemoved = oldEnemyHp - newEnemyHp;   // 0–100 (% of max HP)
      if (hpFractionRemoved > 0) {
        const totalExpReward = expGained(enemySpecies?.baseExp ?? 64, enemyLevel);
        awardExp(Math.round(totalExpReward * hpFractionRemoved / 100));
      }

      setFocusPips(isCrit ? 0 : allCorrect ? Math.min(5, focusPipsRef.current + 1) : 0);

      if (damagePct > 0) {
        hitJuice('player');
        const floatId = Date.now();
        setFloats((f) => [...f, { id: floatId, amount: damage, correct: allCorrect, crit: isCrit, target: 'enemy' }]);
        setTimeout(() => setFloats((f) => f.filter((x) => x.id !== floatId)), 1800);
      }

      return newEnemyHp <= 0;
    };

    const nextTurn = () => {
      setPanel('moves');
      setSelectedMove(null);
      q.clear();
    };

    // The player's move lands first, then the wild Pokémon counterattacks.
    if (performPlayerHit()) {
      setTimeout(handleVictory, 1200);   // enemy fainted — player wins outright
      return;
    }
    setTimeout(() => {
      if (enemyAttack()) {
        const next = firstAlive(activeIdRef.current);
        if (next) switchTo(next); else handleBlackout();
        return;
      }
      nextTurn();
    }, 1200);
  }

  // ── Pick move → queue N challenges → start the first timer ───────────────────

  function handlePickMove(slot: MoveSlot) {
    if (slot.currentPp === 0) return;
    if (playerFainted) return;   // a fainted Pokémon can't attack

    // Persist the PP decrement to this Pokémon's stored move list (per move, per Pokémon)
    if (battle && playerPokemon) {
      const newMoves = playerPokemon.moves.map((m) =>
        m.moveId === slot.moveId ? { ...m, currentPp: Math.max(0, m.currentPp - 1) } : m,
      );
      updatePokemon(playerPokemon.instanceId, { moves: newMoves });
    }

    // The move's full damage vs this enemy (matches the number on the move row,
    // including a charged crit) — the damage a flawless answer set would deal.
    const isCrit  = focusPipsRef.current >= 5;
    const baseDmg = Math.max(1, Math.round(playerMoveDamage({
      power:           slot.power,
      category:        slot.category,
      moveType:        slot.type,
      attacker:        playerStats ?? { attack: 10, defense: 10, spAtk: 10, spDef: 10 },
      attackerTypes:   activePlayerTypes,
      attackerLevel:   playerLevel,
      defender:        enemyStats ?? { attack: 10, defense: 10, spAtk: 10, spDef: 10 },
      defenderTypes:   activeEnemyTypes,
      defenderDefMult: enemyDefMultRef.current,
      crit:            isCrit,
    })));

    // How many challenges: aim for ~5 across the fight, scaled by the share of the
    // enemy's max HP this move removes. N = ceil(min(1, DMG/MHP) × 5), at least 1.
    const chunk   = enemyMaxHp ? Math.min(1, baseDmg / enemyMaxHp) : 1;
    const count   = Math.max(1, Math.ceil(chunk * 5));
    const puzzles = Array.from({ length: count }, () => generateRankedPuzzle(mathRank));

    setSelectedMove(slot);
    resolvedRef.current = false;   // arm the final resolution
    setPanel('math');
    q.begin(puzzles, baseDmg, isCrit);
  }

  // ── Use potion ──────────────────────────────────────────────────────────────

  function handleUsePotion(key: keyof Potions) {
    const heal  = POTION_HEAL[key];
    const label = POTION_LABEL[key];
    setPotions((p) => ({ ...p, [key]: p[key] - 1 }));
    adjustPotions(key, -1);
    // `heal` is in HP points — convert to a percentage of this Pokémon's max HP
    // before applying it to the 0–100 HP bar. Spec §5 (potions).
    const beforePct = playerHpPctRef.current;
    const healPct   = playerMaxHp ? (heal / playerMaxHp) * 100 : heal;
    const newPct    = Math.min(100, beforePct + healPct);
    setPlayerHpPct(newPct);
    playerHpPctRef.current = newPct;
    // Report the HP actually restored (capped when near full).
    const restored = playerMaxHp ? Math.round((newPct - beforePct) / 100 * playerMaxHp) : heal;
    setPotMsg(`${playerName} restored +${restored} HP! (${label})`);
    setTimeout(() => { setPotMsg(null); setPanel('moves'); }, 1100);
  }

  // ── Ball / catch ───────────────────────────────────────────────────────────

  function handleSelectBall(ball: BallOption) {
    // Catch challenges always use the current rank — never a lower-rank review.
    const puzzle = generateRankedPuzzle(mathRank, false);
    setSelectedBall(ball);
    setCatchPuzzle(puzzle);
    setCatchResult(null);
    q.setAnswer('');
    setResult(null);
    setPanel('catch');
    // Expiry handled by the effect above; starts after the "get ready" beat.
    q.startTimer(puzzle.timeLimitSeconds ?? 6, undefined, 900);
  }

  function handleSubmitCatch() {
    if (!catchPuzzle || !selectedBall || catchResult !== null || catchPhase !== null) return;
    const v = parseInt(q.answer, 10);
    if (isNaN(v)) return;
    q.stopTimer();

    const correct      = v === catchPuzzle.answer;
    const accuracyMult = correct ? 1.0 : 0.75;
    const enemySpeciesCatchRate = enemySpecies?.catchRate ?? 128;
    const prob = catchProbability(enemySpeciesCatchRate, selectedBall.baseRate, enemyHpPct) * accuracyMult;
    const caught = Math.random() < prob;

    adjustPokeballs(selectedBall.consumableKey, -1);
    setResult(correct ? 'ok' : 'no');

    // Suspense ritual: the ball arcs over (fly), rocks three times on the
    // ground (wobble), and only then does the catch resolve.
    setCatchPhase('fly');
    setTimeout(() => setCatchPhase('wobble'), 650);
    setTimeout(() => resolveCatch(caught), 650 + 1450);
  }

  function resolveCatch(caught: boolean) {
    if (caught) {
      // Hold the stilled ball for a beat, then jump to the full-screen summary.
      setCatchPhase('caught');
      setTimeout(() => {
        const bt = useBattleStore.getState().battle;
        if (!bt) return;
        // Persist every party member's battle HP (catching shouldn't heal them).
        persistAllHp();
        addCaughtPokemon({
          speciesId: bt.enemy.speciesId,
          totalExp:  bt.enemy.totalExp,
          currentHp: bt.enemy.currentHp,
          moves:     bt.enemy.moves,
        });
        const caughtSpecies = getSpecies(bt.enemy.speciesId);
        endBattle();
        navigate('/summary', { state: { battleOutcome: 'caught', name: caughtSpecies?.name ?? 'Pokémon', dexNumber: caughtSpecies?.dexNumber } });
      }, 700);
    } else {
      setCatchPhase(null);   // the ball vanishes, the Pokémon pops back out
      setCatchResult('escaped');
      setTimeout(() => {
        const enemyDmg = Math.max(1, Math.round(5 + Math.random() * 10));
        const newPlayerHp = Math.max(0, playerHpPctRef.current - enemyDmg);
        setPlayerHpPct(newPlayerHp);
        playerHpPctRef.current = newPlayerHp;
        hpStashRef.current[activeIdRef.current] = newPlayerHp;
        const dmgAmt = playerMaxHp ? Math.max(1, Math.round(enemyDmg / 100 * playerMaxHp)) : enemyDmg;
        const pfId   = Date.now();
        setFloats((f) => [...f, { id: pfId, amount: dmgAmt, correct: false, crit: false, target: 'player' }]);
        setTimeout(() => setFloats((f) => f.filter((x) => x.id !== pfId)), 1800);
        const actualHp = playerMaxHp ? Math.round(newPlayerHp / 100 * playerMaxHp) : newPlayerHp;
        if (actualHp <= 0) {
          // Active Pokémon fainted while catching — send out the next one or black out.
          const next = firstAlive(activeIdRef.current);
          if (next) switchTo(next); else handleBlackout();
          return;
        }
        setPanel('moves');
        setResult(null);
        q.setAnswer('');
        setSelectedBall(null);
        setCatchPuzzle(null);
        setCatchResult(null);
      }, 1600);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const isSuperEff = selectedMove
    ? effectiveMultiplier(selectedMove.type, activeEnemyTypes) > 1 && selectedMove.power > 0
    : false;

  // Once every challenge is answered, a *deliberate* Enter press fires the "Deal
  // damage" button (no input is focused then, so we listen at the window level).
  // The Enter that solved the last challenge must NOT carry through and auto-deal,
  // so we ignore key auto-repeats and any Enter within a short settle window after
  // the reveal appears — the player has to press Enter again (or click the button).
  useEffect(() => {
    if (panel !== 'math' || !q.allAnswered) return;
    const revealedAt = Date.now();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return;
      if (Date.now() - revealedAt < 400) return;   // the answer-submission Enter
      e.preventDefault();
      applyComputedAttack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, q.allAnswered]);

  const potionCount = totalPotions(potions);
  const ballCount   = totalBalls(trainer.pokeballs);
  const hpCol = (pct: number) => (pct > 50 ? '#48c774' : pct > 20 ? '#F8D030' : '#CC0000');

  // Player EXP bar (progress within the current level + amount to next).
  const expBarPct = playerPokemon ? (() => {
    const lvl = levelFromExp(playerPokemon.totalExp);
    const range = expToLevel(lvl + 1) - expToLevel(lvl);
    const progress = playerPokemon.totalExp - expToLevel(lvl);
    return range > 0 ? Math.max(0, Math.min(100, Math.round((progress / range) * 100))) : 0;
  })() : 0;
  const expToNext = playerPokemon
    ? Math.max(0, expToLevel(levelFromExp(playerPokemon.totalExp) + 1) - playerPokemon.totalExp)
    : 0;

  // Moves with pre-computed full-power damage vs the current enemy + type info,
  // sorted by damage (highest first). Status moves use the fixed chip power.
  const sortedMoves: SortedMove[] = realMoves.map((slot) => {
    const isStatus = slot.power === 0;
    const dmg = (playerStats && enemyStats)
      ? playerMoveDamage({
          power:           slot.power,
          category:        slot.category,
          moveType:        slot.type,
          attacker:        playerStats,
          attackerTypes:   activePlayerTypes,
          attackerLevel:   playerLevel,
          defender:        enemyStats,
          defenderTypes:   activeEnemyTypes,
          defenderDefMult: enemyDefMult,
          crit:            focusPips >= 5,
        })
      : null;
    const mult   = effectiveMultiplier(slot.type, activeEnemyTypes);
    const seType = !isStatus ? activeEnemyTypes.find((t) => getTypeMultiplier(slot.type, t) === 2) : undefined;
    const eff: SortedMove['eff'] =
      isStatus ? 'status' : mult >= 2 ? 'super' : mult <= 0.5 ? 'resist' : 'neutral';
    return { slot, isStatus, dmg, seType, eff };
  }).sort((a, b) => (b.dmg ?? 0) - (a.dmg ?? 0));

  // How hard this opponent can hit the active Pokémon — min/max across its whole
  // moveset (matches the random move it actually picks). Shown under its HP bar.
  const enemyDmgRange = (() => {
    if (!battle || !enemyStats || !playerStats) return null;
    const enemyTypes = enemySpecies?.types ?? [];
    const dmgs = battle.enemy.moves.map((m) =>
      enemyMoveDamage(m.moveId, enemyStats, playerStats, enemyTypes, activePlayerTypes, enemyLevel, enemyAtkMultRef.current, playerDefMultRef.current),
    );
    if (!dmgs.length) return null;
    return { min: Math.min(...dmgs), max: Math.max(...dmgs) };
  })();

  // Whether this wild species is already registered in the player's collection,
  // and (if so) the highest level owned — shown in the ball-throwing view. Only
  // one per species is kept, so a catch that isn't higher level is released.
  const ownedSameSpecies = battle ? trainer.caughtPokemon.filter((p) => p.speciesId === battle.enemy.speciesId) : [];
  const alreadyCaught     = ownedSameSpecies.length > 0;
  const ownedBestLevel    = alreadyCaught ? Math.max(...ownedSameSpecies.map((p) => levelFromExp(p.totalExp))) : 0;
  // True when catching this wild would NOT keep it (you already own one as good).
  const catchWouldRelease = alreadyCaught && enemyLevel <= ownedBestLevel;

  // ── Party carousel ───────────────────────────────────────────────────────────
  const activeId      = battle?.activePlayerInstanceId ?? '';
  const activeIdx     = party.findIndex((p) => p.instanceId === activeId);
  const hasParty      = party.length > 1 && activeIdx >= 0;

  // While a damage number is floating over a combatant, show the impact poof
  // in place of its sprite; the Pokémon returns when the float clears.
  const playerHit = floats.some((f) => f.target === 'player');
  const enemyHit  = floats.some((f) => f.target === 'enemy');

  // Battle HP% of a party member (the active one's is live; others come from the
  // stash). Used to skip fainted members in the carousel and to block attacks.
  const memberHpPct = (id: string) => (id === activeId ? playerHpPctRef.current : (hpStashRef.current[id] ?? 100));
  // Is the active Pokémon fainted? A fainted Pokémon must not attack.
  const playerCurrentHp = playerMaxHp ? Math.round(playerHpPct / 100 * playerMaxHp) : 0;
  const playerFainted   = !!battle && playerCurrentHp <= 0;
  // Switch to the next/previous *healthy* party member (skips fainted ones).
  const switchDir = (dir: 1 | -1) => {
    if (!hasParty) return;
    const n = party.length;
    for (let step = 1; step <= n; step++) {
      const idx = (((activeIdx + dir * step) % n) + n) % n;
      const id  = party[idx].instanceId;
      if (id !== activeId && memberHpPct(id) > 0) { switchTo(id); return; }
    }
  };
  const anyOtherAlive = hasParty && party.some((p) => p.instanceId !== activeId && memberHpPct(p.instanceId) > 0);
  // Switching is allowed on the move-select view (once any opening strike has
  // landed) whenever there is another healthy Pokémon to send out.
  const switchEnabled = hasParty && panel === 'moves' && canSwitch && anyOtherAlive;

  // Tapping a combatant opens its Pokédex entry. Persist live HP first so that
  // returning to the battle restores it (the battle store survives client-side
  // routing; only a full reload clears it).
  const openSpeciesDetail = (speciesId?: string) => {
    if (!speciesId) return;
    persistAllHp();
    useBattleStore.getState().setEnemyHpPct(enemyHpPct);
    navigate(`/pokemon/${speciesId}`);
  };

  // The battle store is transient — a page reload loses it. If there was no
  // battle when this screen first mounted (i.e. a genuine reload), bounce back
  // to the dungeon rather than rendering an empty stage with placeholders.
  // (When a battle ends normally, the victory/flee/catch handlers navigate with
  // their outcome state — we must not clobber that with a stateless redirect.)
  const mountedWithoutBattleRef = useRef(!battle);
  useEffect(() => {
    if (mountedWithoutBattleRef.current) navigate('/dungeon', { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!battle) return null;

  return (
    <div className={b.screen}>
      <img className={b.bg} src={BATTLE_URL} alt="" />
      <div className={b.content}>

        {/* ── Header: Flee + money ── */}
        <div className={b.header}>
          <button className={b.fleeBtn} onClick={handleFlee}>← Flee</button>
          <span className={b.moneyChip}>₽{trainer.pokeDollars.toLocaleString()}</span>
        </div>

        {/* ── Battle stage ── */}
        <div className={`${b.arena} ${shaking ? b.shake : ''}`}>

          {/* My Pokémon — panel top-left, standing on the ground */}
          <div className={b.nameBadge} style={{ top: 10, left: '28%', transform: 'translateX(-50%)' }}>
            <img className={b.trainerDot} src={TRAINER_IMG} alt="" />
            <div className={b.nameRow} style={{ paddingLeft: 22 }}>
              <span className={b.nameText}>{playerSpecies?.name ?? '?'}</span>
              <span className={b.nameLv}>Lv{playerLevel}</span>
              {(() => { const tc = typeColors(activePlayerTypes[0]); return <span className={b.typeBadge} style={{ background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}` }}>{activePlayerTypes[0]}</span>; })()}
            </div>
            <div className={b.hpRow}>
              <span className={b.hpLabel}>HP</span>
              <HpBar pct={playerHpPct} color={hpCol(playerHpPct)} />
              <span className={b.hpText}>{playerMaxHp ? `${Math.max(0, Math.round(playerHpPct / 100 * playerMaxHp))}/${playerMaxHp}` : `${playerHpPct}%`}</span>
            </div>
            <div className={b.hpRow}>
              <span className={b.hpLabel} style={{ color: '#6890F0' }}>XP</span>
              <div className={b.hpTrack}><div className={b.hpFill} style={{ width: `${expBarPct}%`, background: '#6890F0' }} /></div>
              <span className={b.hpText}>{expToNext > 0 ? `-${expToNext}` : 'MAX'}</span>
            </div>
          </div>
          <div className={b.groundShadow} style={{ left: '28%', top: 202, width: 76, height: 14, transform: 'translateX(-50%)' }} />
          {playerHit
            ? <img className={b.hitFx} src={HIT_URL} alt="" style={{ left: '28%', top: 134, width: 120, height: 120, transform: 'translateX(-50%)' }} />
            : <img key={activeId} className={`${b.sprite} ${playerLunge ? b.lungeRight : ''}`} src={getIdleSpriteUrl(playerDexNumber)} alt="" onClick={() => openSpeciesDetail(playerSpecies?.id)} style={{ left: '28%', top: 146, width: 96, height: 96, transform: 'translateX(-50%)', cursor: 'pointer' }} />}
          {hasParty && (
            <>
              <button className={b.arrowBtn} style={{ left: 'calc(28% - 72px)', top: 176 }} disabled={!switchEnabled} onClick={() => switchDir(-1)} aria-label="Previous Pokémon">‹</button>
              <button className={b.arrowBtn} style={{ left: 'calc(28% + 40px)', top: 176 }} disabled={!switchEnabled} onClick={() => switchDir(1)} aria-label="Next Pokémon">›</button>
            </>
          )}
          {floats.filter((f) => f.target === 'player').map((f) => (
            <div key={f.id} className={b.float} style={{ left: '28%', top: 126, transform: 'translateX(-50%)', fontSize: 15, color: '#e0574f' }}>-{f.amount}</div>
          ))}

          {/* Mid-battle level-up / evolution celebration over the player's Pokémon */}
          {levelUpMsg && (
            <div className={`${b.banner} pulsing`} style={{ top: 118, left: '28%', background: '#1a1400', border: '1px solid #FFCB05', color: '#FFCB05' }}>
              {levelUpMsg}
            </div>
          )}

          {/* Opponent — panel top-right, standing on the ground */}
          <div className={b.nameBadge} style={{ top: 10, left: '72%', transform: 'translateX(-50%)' }}>
            <div className={b.nameRow}>
              <span className={b.nameText}>{enemySpecies?.name ?? '?'}</span>
              <span className={b.nameLv}>Lv{enemyLevel}</span>
              {(() => { const tc = typeColors(activeEnemyTypes[0]); return <span className={b.typeBadge} style={{ background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}` }}>{activeEnemyTypes[0]}</span>; })()}
            </div>
            <div className={b.hpRow}>
              <span className={b.hpLabel}>HP</span>
              <HpBar pct={enemyHpPct} color={hpCol(enemyHpPct)} />
              <span className={b.hpText}>{enemyMaxHp ? `${Math.max(0, Math.round(enemyHpPct / 100 * enemyMaxHp))}/${enemyMaxHp}` : `${enemyHpPct}%`}</span>
            </div>
            {enemyDmgRange && (
              <div className={b.dmgRangeRow}>
                <span className={b.dmgRangeVal}>{enemyDmgRange.min === enemyDmgRange.max ? `${enemyDmgRange.min}` : `${enemyDmgRange.min}–${enemyDmgRange.max}`} DMG</span>
              </div>
            )}
          </div>
          <div className={b.groundShadow} style={{ left: '72%', top: 200, width: 72, height: 13, transform: 'translateX(-50%)' }} />
          {enemyHit
            ? <img className={b.hitFx} src={HIT_URL} alt="" style={{ left: '72%', top: 132, width: 120, height: 120, transform: 'translateX(-50%)' }} />
            : (catchPhase === 'wobble' || catchPhase === 'caught')
              ? null   /* inside the thrown Poké Ball */
              : <img className={`${b.sprite} ${enemyLunge ? b.lungeLeft : ''}`} src={getIdleSpriteUrl(enemyDexNumber)} alt="" onClick={() => openSpeciesDetail(enemySpecies?.id)} style={{ left: '72%', top: 146, width: 92, height: 92, transform: 'translateX(-50%) scaleX(-1)', cursor: 'pointer' }} />}

          {/* Thrown Poké Ball — arcs over, then wobbles on the ground */}
          {catchPhase && selectedBall && (
            <img
              className={`${b.ballFx} ${catchPhase === 'fly' ? b.ballFly : b.ballWobble}`}
              src={getBallSpriteUrl(selectedBall.consumableKey)}
              alt=""
            />
          )}
          {floats.filter((f) => f.target === 'enemy').map((f) => (
            <div key={f.id} className={b.float} style={{ left: '72%', top: 126, transform: 'translateX(-50%)', fontSize: f.crit ? 20 : 15, color: f.crit ? '#ff7b00' : f.correct ? '#FFCB05' : '#e0574f' }}>
              {f.crit && <div style={{ fontSize: 8, color: '#ff7b00' }}>CRITICAL!</div>}-{f.amount}
            </div>
          ))}

          {statusMsg && <div className={b.banner} style={{ top: 98, background: 'rgba(0,0,0,0.72)', border: '1px solid #FFCB05' }}>{statusMsg}</div>}
        </div>

        {/* ── Focus meter ── */}
        <div className={`${b.focusStrip} ${focusPips >= 5 ? b.focusStripFull : ''}`}>
          <span className={b.focusLabel}>FOCUS</span>
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className={`${b.pip} ${i < focusPips ? b.pipOn : ''}`} />)}
          <span className={`${b.focusHint} ${focusPips >= 5 ? b.focusHintFull : ''}`}>{focusPips >= 5 ? 'CRIT READY!' : '5 = x2 CRIT'}</span>
        </div>

        {/* ── Bottom panel ── */}
        <div className={b.bottom}>

          {panel === 'moves' && (
            <MoveList
              moves={sortedMoves}
              playerFainted={playerFainted}
              playerName={playerSpecies?.name ?? 'Your Pokémon'}
              critReady={focusPips >= 5}
              potionCount={potionCount}
              ballCount={ballCount}
              onPick={handlePickMove}
              onPotion={() => setPanel('potion')}
              onBall={() => setPanel('ball')}
            />
          )}

          {panel === 'math' && selectedMove && q.challenges.length > 0 && (
            <MathPanel
              move={selectedMove}
              q={q}
              isSuperEff={isSuperEff}
              onBack={() => { q.stopTimer(); setPanel('moves'); }}
              onDeal={applyComputedAttack}
            />
          )}

          {panel === 'potion' && (
            <PotionPanel potions={potions} message={potMsg} onUse={handleUsePotion} onBack={() => setPanel('moves')} />
          )}

          {panel === 'ball' && (
            <BallPanel
              enemyHpPct={enemyHpPct}
              enemyCatchRate={enemySpecies?.catchRate ?? 128}
              pokeballs={trainer.pokeballs}
              enemyName={enemyName}
              enemyLevel={enemyLevel}
              alreadyCaught={alreadyCaught}
              catchWouldRelease={catchWouldRelease}
              ownedBestLevel={ownedBestLevel}
              onSelect={handleSelectBall}
              onBack={() => setPanel('moves')}
            />
          )}

          {panel === 'catch' && selectedBall && catchPuzzle && (
            <CatchPanel
              ball={selectedBall}
              puzzle={catchPuzzle}
              catchResult={catchResult}
              result={result}
              throwing={catchPhase !== null}
              ready={q.ready}
              enemyHpPct={enemyHpPct}
              timer={q.timer}
              answer={q.answer}
              setAnswer={q.setAnswer}
              onSubmit={handleSubmitCatch}
              onBack={() => { q.stopTimer(); setPanel('ball'); }}
            />
          )}

        </div>
      </div>
    </div>
  );
}
