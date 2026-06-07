import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import type { PokeType } from '../types/pokemon';
import type { MoveCategory } from '../types/moves';
import type { MathPuzzle } from '../types/math';
import type { Pokeballs, Potions } from '../types/gameState';
import { D, FONT_PIXEL, FONT_UI, typeColors } from '../styles/tokens';
import { getMove } from '../data/moves';
import { getSpecies } from '../data/species';
import { calcHp, calcAllStats, calcDamage, catchProbability, hpZone, battleTimerSeconds, expGained, levelFromExp, expToLevel } from '../lib/formulas';
import { getSpriteUrl, getBallSpriteUrl, getItemSpriteUrl } from '../lib/sprites';
import { generateBattlePuzzle, effectiveMultiplier } from '../lib/mathProblemGenerator';
import { useBattleStore }  from '../store/battleStore';
import { useGameStore, useActiveTrainer, getPartyPokemon }    from '../store/gameStore';
import { useDungeonStore } from '../store/dungeonStore';
import type { MathTopic } from '../types/math';

// ── Local types ───────────────────────────────────────────────────────────────

interface MoveSlot {
  moveId: string;
  name: string;
  type: PokeType;
  category: MoveCategory;
  power: number;
  currentPp: number;
  maxPp: number;
}

interface DmgFloat {
  id: number;
  amount: number;
  correct: boolean;
  crit: boolean;
  /** Which combatant took the damage — controls where the number floats. */
  target: 'enemy' | 'player';
}

interface BallOption {
  name: string;
  /** 0–1 base catch rate multiplier. Spec §5.7. */
  baseRate: number;
  /** Percentage shown in the puzzle equation (40 / 60 / 80). */
  basePercent: number;
  consumableKey: keyof Pokeballs;
}

const BALLS: BallOption[] = [
  { name: 'Poké Ball',  baseRate: 0.4, basePercent: 40, consumableKey: 'pokeball'  },
  { name: 'Great Ball', baseRate: 0.6, basePercent: 60, consumableKey: 'greatBall' },
  { name: 'Ultra Ball', baseRate: 0.8, basePercent: 80, consumableKey: 'ultraBall' },
];

const POTION_HEAL: Record<keyof Potions, number> = { potion: 20, superPotion: 60, hyperPotion: 120 };
const POTION_LABEL: Record<keyof Potions, string> = { potion: 'Potion', superPotion: 'Super Potion', hyperPotion: 'Hyper Potion' };

// HP-zone bonus percentage shown in the catch puzzle equation.
function catchHpBonus(hpPct: number): number {
  if (hpPct < 25) return 40;
  if (hpPct < 50) return 20;
  return 0;
}

function generateCatchPuzzle(ballPercent: number, enemyHpPct: number, floor: number): MathPuzzle {
  const bonus = catchHpBonus(enemyHpPct);
  return {
    id: Date.now(),
    equation: `${ballPercent} + ${bonus} = ?`,
    answer: ballPercent + bonus,
    topic: 'addition' as MathTopic,
    floor,
    context: 'battle',
    timeLimitSeconds: battleTimerSeconds(floor),
  };
}

// ── Status-move effects ───────────────────────────────────────────────────────
// Status moves (power 0) don't deal damage — instead they apply a battle stat
// modifier (a multiplier) to the enemy or the player that affects subsequent
// damage. Each effect persists for the rest of the battle. Spec §4 (status moves).

type StatTarget = 'enemyAtk' | 'enemyDef' | 'playerDef';
interface StatusEffect {
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
function statusEffectFor(moveId: string): StatusEffect {
  return STATUS_EFFECTS[moveId] ?? { target: 'enemyDef', factor: 0.80, msg: "Enemy's DEFENSE fell!" };
}

/** Soften an effect toward 1 (no change) when the answer was wrong. */
function softenFactor(factor: number, correct: boolean): number {
  return correct ? factor : 1 + (factor - 1) / 2;
}

// ── Demo data — used when no active battle in the store ───────────────────────

const DEMO_FLOOR = 8;
const DEMO_ENEMY_TYPES: readonly PokeType[] = ['Water'];
const DEMO_PLAYER_TYPE: PokeType = 'Electric';

function buildSlot(id: string, currentPp: number, maxPp: number): MoveSlot {
  const m = getMove(id);
  if (!m) throw new Error(`Unknown move id: ${id}`);
  return { moveId: id, name: m.name, type: m.type, category: m.category, power: m.power, currentPp, maxPp };
}

const DEMO_MOVES: MoveSlot[] = [
  buildSlot('thunderbolt',  10, 15),
  buildSlot('quick-attack', 27, 30),
  buildSlot('thundershock', 20, 30),
  buildSlot('thunderwave',  15, 20),
];

// ── Shared mini-components ────────────────────────────────────────────────────

function HPBar({ pct, current, max }: { pct: number; current?: number; max?: number }) {
  const col = pct > 50 ? '#48c774' : pct > 20 ? '#F8D030' : '#CC0000';
  const label = current !== undefined && max !== undefined ? `${current}/${max}` : `${pct}%`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.white, minWidth: 14 }}>HP</span>
      <div style={{ flex: 1, height: 8, background: '#111', border: '1px solid #ffffff20', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 4, transition: 'width .5s' }} />
      </div>
      <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: col, minWidth: 44, textAlign: 'right' }}>{label}</span>
    </div>
  );
}

function TypeBadge({ type, large }: { type: string; large?: boolean }) {
  const tc = typeColors(type);
  return (
    <span style={{
      display: 'inline-block', fontFamily: FONT_UI, fontWeight: 800,
      fontSize: large ? 12 : 10, padding: large ? '3px 12px' : '2px 8px',
      borderRadius: 99, textTransform: 'uppercase', letterSpacing: 0.5,
      background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}`,
    }}>
      {type}
    </span>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '12px 14px', fontFamily: FONT_UI, fontSize: 14,
      fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: 0.5,
      background: 'transparent', color: D.muted, border: `2px solid ${D.border}`,
      borderRadius: 12, cursor: 'pointer',
    }}>
      ← Back
    </button>
  );
}

// ── BattleScreen ──────────────────────────────────────────────────────────────

type Panel = 'action' | 'moves' | 'math' | 'potion' | 'ball' | 'catch';

export default function BattleScreen() {
  const navigate = useNavigate();

  // ── Store reads ─────────────────────────────────────────────────────────────
  const battle    = useBattleStore((s) => s.battle);
  const endBattle = useBattleStore((s) => s.endBattle);
  const dungeonFloor = useDungeonStore((s) => s.floor);

  const trainer = useActiveTrainer();
  const { addCaughtPokemon, adjustPotions, adjustPokeballs, recordMathAttempt, updatePokemon, healParty } = useGameStore(
    useShallow((gs) => ({
      addCaughtPokemon:   gs.addCaughtPokemon,
      adjustPotions:      gs.adjustPotions,
      adjustPokeballs:    gs.adjustPokeballs,
      recordMathAttempt:  gs.recordMathAttempt,
      updatePokemon:      gs.updatePokemon,
      healParty:          gs.healParty,
    }))
  );

  const party        = getPartyPokemon(trainer);
  const currentFloor = trainer.currentFloor;

  // ── Derive active context (real vs demo) ────────────────────────────────────
  const playerPokemon  = party.find((p) => p.instanceId === battle?.activePlayerInstanceId) ?? null;
  const playerSpecies  = playerPokemon ? getSpecies(playerPokemon.speciesId) : null;
  const enemySpecies   = battle ? getSpecies(battle.enemy.speciesId) : null;

  const activeFloor      = battle ? currentFloor : DEMO_FLOOR;

  // Floor encounter progress
  const encounterRooms   = (dungeonFloor?.rooms ?? []).filter(
    (r) => r.type === 'encounter' || r.type === 'boss',
  );
  const clearedCount     = encounterRooms.filter((r) => r.cleared).length;
  const encounterCurrent = battle ? clearedCount + 1 : 3;
  const encounterTotal   = battle ? encounterRooms.length || 1 : 5;
  const progressPct      = Math.min(100, Math.round((encounterCurrent / encounterTotal) * 100));
  const activeEnemyTypes  = (battle && enemySpecies ? enemySpecies.types  : DEMO_ENEMY_TYPES)  as readonly PokeType[];
  const activePlayerTypes = (playerSpecies          ? playerSpecies.types  : [DEMO_PLAYER_TYPE]) as readonly PokeType[];
  const activePlayerType  = activePlayerTypes[0];

  // Derive level from totalExp
  const playerLevel = playerPokemon ? levelFromExp(playerPokemon.totalExp) : 24;
  const enemyLevel  = battle ? levelFromExp(battle.enemy.totalExp) : 22;

  const enemyStats  = enemySpecies  && battle          ? calcAllStats(enemySpecies.baseStats,  enemyLevel)      : null;
  const playerStats = playerSpecies && playerPokemon    ? calcAllStats(playerSpecies.baseStats, playerLevel)     : null;

  const enemyMaxHp     = enemyStats?.maxHp ?? null;
  const playerMaxHp    = playerStats?.maxHp ?? null;

  // Build real move slots from the player Pokémon's moves
  const realMoves: MoveSlot[] = (playerPokemon?.moves ?? []).flatMap((lm) => {
    const m = getMove(lm.moveId);
    // OwnedMove has no maxPp; fall back to the move definition's pp
    const maxPp = m?.pp ?? 20;
    return m ? [{ moveId: lm.moveId, name: m.name, type: m.type, category: m.category, power: m.power, currentPp: lm.currentPp, maxPp }] : [];
  });

  const activeMoves = battle ? realMoves : DEMO_MOVES;

  // Initial HP percentages
  const initEnemyHp = battle ? battle.enemyHpPercent : 74;
  const initPlayerHp = (() => {
    if (battle && playerPokemon && playerSpecies) {
      const maxHp = calcHp(playerSpecies.baseStats.hp, playerLevel);
      return Math.min(100, Math.max(1, Math.round((playerPokemon.currentHp / maxHp) * 100)));
    }
    return 82;
  })();
  const initFocusPips = battle ? battle.focusPips : 2;

  // Display info
  const playerName      = playerSpecies?.name.toUpperCase() ?? 'PIKACHU';
  const playerDexNumber = playerSpecies?.dexNumber ?? 25;
  const enemyName       = enemySpecies?.name.toUpperCase() ?? 'GYARADOS';
  const enemyDexNumber  = enemySpecies?.dexNumber ?? 130;

  const expBarPct = (() => {
    if (!playerPokemon) return 62;
    const lvl = levelFromExp(playerPokemon.totalExp);
    const range = expToLevel(lvl + 1) - expToLevel(lvl);
    const progress = playerPokemon.totalExp - expToLevel(lvl);
    return range > 0 ? Math.max(0, Math.min(100, Math.round((progress / range) * 100))) : 0;
  })();

  // ── Component state ─────────────────────────────────────────────────────────
  const [panel, setPanel]               = useState<Panel>('action');
  const [selectedMove, setSelectedMove] = useState<MoveSlot | null>(null);
  const [currentPuzzle, setPuzzle]      = useState<MathPuzzle | null>(null);
  const [answer, setAnswer]             = useState('');
  const [timer, setTimer]               = useState(6);
  const [result, setResult]             = useState<'ok' | 'no' | null>(null);
  const [enemyHpPct, setEnemyHpPct]     = useState(initEnemyHp);
  const [playerHpPct, setPlayerHpPct]   = useState(initPlayerHp);
  const [focusPips, setFocusPips]       = useState(initFocusPips);
  const [floats, setFloats]             = useState<DmgFloat[]>([]);
  const [potMsg, setPotMsg]             = useState<string | null>(null);
  const [statusMsg, setStatusMsg]       = useState<string | null>(null);
  const [blackout, setBlackout]         = useState(false);
  const [potions, setPotions]           = useState({
    potion:      trainer.potions.potion,
    superPotion: trainer.potions.superPotion,
    hyperPotion: trainer.potions.hyperPotion,
  });
  // Catch flow
  const [selectedBall, setSelectedBall] = useState<BallOption | null>(null);
  const [catchPuzzle, setCatchPuzzle]   = useState<MathPuzzle | null>(null);
  const [catchResult, setCatchResult]   = useState<'caught' | 'escaped' | null>(null);
  const [movePp, setMovePp]             = useState<Record<string, number>>(
    () => Object.fromEntries(activeMoves.map((m) => [m.moveId, m.currentPp]))
  );
  // Track enemy HP in a ref to read synchronously inside resolveAttack
  const enemyHpRef = useRef(initEnemyHp);

  const tiRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const inpRef       = useRef<HTMLInputElement>(null);
  const moveRef      = useRef<MoveSlot | null>(null);
  const resultRef    = useRef<'ok' | 'no' | null>(null);
  const focusPipsRef = useRef(initFocusPips);
  const playerHpPctRef = useRef(initPlayerHp);
  // Guards resolveAttack against re-entry: each puzzle resolves exactly once.
  // resolveAttack is recreated every render (stats are fresh objects), so the
  // timer-expiry effect can otherwise fire it repeatedly. Reset on new puzzle.
  const resolvedRef = useRef(false);
  const puzzleRef   = useRef<MathPuzzle | null>(null);
  // Battle stat modifiers from status moves (1 = no change). Persist for the
  // whole battle; reset naturally because a new battle remounts this screen.
  const enemyAtkMultRef = useRef(1);
  const enemyDefMultRef = useRef(1);
  const playerDefMultRef = useRef(1);

  useEffect(() => { moveRef.current      = selectedMove; }, [selectedMove]);
  useEffect(() => { resultRef.current    = result; }, [result]);
  useEffect(() => { puzzleRef.current    = currentPuzzle; }, [currentPuzzle]);
  useEffect(() => { focusPipsRef.current = focusPips; }, [focusPips]);
  useEffect(() => { playerHpPctRef.current = playerHpPct; }, [playerHpPct]);
  useEffect(() => () => { if (tiRef.current) clearInterval(tiRef.current); }, []);

  // ── Victory / flee navigation ───────────────────────────────────────────────

  const handleVictory = useCallback(() => {
    const currentBattle = useBattleStore.getState().battle;
    if (!currentBattle) {
      endBattle();
      navigate('/dungeon', { state: { battleOutcome: 'victory' } });
      return;
    }

    const { earnPokeDollars: epd, updatePokemon: upd } = useGameStore.getState();
    const gs = useGameStore.getState();
    const activeTrainer = gs.trainers.find(t => t.id === gs.activeTrainerId)!;
    const currentParty  = getPartyPokemon(activeTrainer);

    const enemySpec  = getSpecies(currentBattle.enemy.speciesId);
    const baseExp    = enemySpec?.baseExp ?? 64;
    const expReward  = expGained(baseExp, enemyLevel);
    const pokeReward = Math.floor(enemyLevel * 10 + currentFloor * 3);

    const expGains = currentBattle.participantInstanceIds.flatMap((instanceId) => {
      const pk = currentParty.find((p) => p.instanceId === instanceId);
      if (!pk) return [];
      const spec     = getSpecies(pk.speciesId);
      const oldLevel = levelFromExp(pk.totalExp);
      const newExp   = pk.totalExp + expReward;
      const newLevel = levelFromExp(newExp);
      const isActive = instanceId === currentBattle.activePlayerInstanceId;
      const currentHp = isActive && spec
        ? Math.max(1, Math.round(playerHpPctRef.current / 100 * calcHp(spec.baseStats.hp, oldLevel)))
        : undefined;
      upd(instanceId, { totalExp: newExp, ...(currentHp !== undefined && { currentHp }) });
      return [{ instanceId, name: spec?.name ?? pk.speciesId, dexNumber: spec?.dexNumber ?? 0, expAdded: expReward, oldLevel, newLevel }];
    });

    epd(pokeReward);
    endBattle();
    navigate('/dungeon', { state: { battleOutcome: 'victory', expGains, pokeReward } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endBattle, navigate, enemyLevel, currentFloor]);

  const handleFlee = useCallback(() => {
    const currentBattle = useBattleStore.getState().battle;
    if (currentBattle) {
      const gs = useGameStore.getState();
      const activeTrainer = gs.trainers.find(t => t.id === gs.activeTrainerId)!;
      const currentParty  = getPartyPokemon(activeTrainer);
      const activePk = currentParty.find((p) => p.instanceId === currentBattle.activePlayerInstanceId);
      if (activePk) {
        const spec = getSpecies(activePk.speciesId);
        if (spec) {
          const lvl = levelFromExp(activePk.totalExp);
          const maxHp = calcHp(spec.baseStats.hp, lvl);
          gs.updatePokemon(activePk.instanceId, { currentHp: Math.max(1, Math.round(playerHpPctRef.current / 100 * maxHp)) });
        }
      }
    }
    endBattle();
    navigate('/dungeon', { state: { battleOutcome: 'fled' } });
  }, [endBattle, navigate]);

  // ── Blackout — active Pokémon fainted ────────────────────────────────────────
  // Shows a brief blackout screen, then returns to town. Everything is kept
  // (caught Pokémon, floors, Pokédollars); the party is healed so there's no
  // soft-lock on re-entry.
  const handleBlackout = useCallback(() => {
    if (tiRef.current) clearInterval(tiRef.current);
    setBlackout(true);
    setTimeout(() => {
      healParty();
      endBattle();
      navigate('/', { state: { blackedOut: true } });
    }, 2200);
  }, [healParty, endBattle, navigate]);

  // ── Attack resolution ───────────────────────────────────────────────────────

  const resolveAttack = useCallback((correct: boolean, slot: MoveSlot) => {
    if (resolvedRef.current) return;   // this puzzle was already resolved
    resolvedRef.current = true;
    if (tiRef.current) clearInterval(tiRef.current);
    setResult(correct ? 'ok' : 'no');

    const mult         = effectiveMultiplier(slot.type, activeEnemyTypes);
    const accuracyMult = correct ? 1.0 : 0.75;

    const stabMult: 1 | 1.5 = activePlayerTypes.some((t) => t === slot.type) ? 1.5 : 1;
    // Charged attack: when the Focus Meter is full (5 pips), a correct answer
    // lands a 2× critical hit and discharges the meter. Spec §4.4.
    const isCrit    = correct && focusPipsRef.current >= 5;
    const critMult: 1 | 2 = isCrit ? 2 : 1;

    let damage    = 0;
    let damagePct = 0;

    // Every move chips the opponent. Status moves (power 0) deal a small fixed
    // amount AND apply their stat effect below, so they always do something visible.
    const STATUS_CHIP_POWER = 20;
    const effPower = slot.power > 0 ? slot.power : STATUS_CHIP_POWER;

    const atkStat = slot.category === 'special'
      ? (playerStats?.spAtk   ?? 10)
      : (playerStats?.attack  ?? 10);
    const baseDef = slot.category === 'special'
      ? (enemyStats?.spDef    ?? 10)
      : (enemyStats?.defense  ?? 10);
    // Apply any enemy DEFENSE debuff accumulated from status moves.
    const defStat = Math.max(1, baseDef * enemyDefMultRef.current);

    damage = calcDamage({
      movePower:          effPower,
      itemBonus:          0,
      attackerAtk:        atkStat,
      defenderDef:        defStat,
      attackerLevel:      playerLevel,
      typeMultiplier:     mult as 0 | 0.5 | 1 | 2,
      stabMultiplier:     stabMult,
      critMultiplier:     critMult,
      accuracyMultiplier: accuracyMult,
    });

    damagePct = enemyMaxHp
      ? Math.min(100, Math.round((damage / enemyMaxHp) * 100))
      : Math.max(1, damage);

    // Status move — additionally apply its battle stat modifier + show a message.
    if (slot.power === 0) {
      const eff    = statusEffectFor(slot.moveId);
      const factor = softenFactor(eff.factor, correct);
      if (eff.target === 'enemyAtk')  enemyAtkMultRef.current  *= factor;
      if (eff.target === 'enemyDef')  enemyDefMultRef.current  *= factor;
      if (eff.target === 'playerDef') playerDefMultRef.current *= factor;
      setStatusMsg(correct ? eff.msg : `${eff.msg} (weak)`);
      setTimeout(() => setStatusMsg(null), 1400);
    }

    const newEnemyHp = Math.max(0, enemyHpRef.current - damagePct);
    if (damagePct > 0) {
      setEnemyHpPct(newEnemyHp);
      enemyHpRef.current = newEnemyHp;
    }

    setFocusPips(isCrit ? 0 : correct ? Math.min(5, focusPipsRef.current + 1) : 0);

    if (damagePct > 0) {
      const floatId = Date.now();
      setFloats((f) => [...f, { id: floatId, amount: damage, correct, crit: isCrit, target: 'enemy' }]);
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== floatId)), 1800);
    }

    // Record the math attempt against the active puzzle's topic
    recordMathAttempt(puzzleRef.current?.topic ?? ('addition' as MathTopic), correct);

    if (newEnemyHp <= 0) {
      setTimeout(handleVictory, 1200);
    } else {
      setTimeout(() => {
        let enemyDamagePct = 5;
        if (enemyStats && playerStats && playerMaxHp) {
          const enemyDmg = calcDamage({
            movePower:          40,
            itemBonus:          0,
            // Apply status-move modifiers: enemy ATK debuff + player DEF buff.
            attackerAtk:        Math.max(1, enemyStats.attack   * enemyAtkMultRef.current),
            defenderDef:        Math.max(1, playerStats.defense * playerDefMultRef.current),
            attackerLevel:      enemyLevel,
            typeMultiplier:     1,
            stabMultiplier:     1,
            critMultiplier:     1,
            accuracyMultiplier: 1,
          });
          enemyDamagePct = Math.max(1, Math.min(100, Math.round((enemyDmg / playerMaxHp) * 100)));
        }
        const newPlayerHp = Math.max(0, playerHpPctRef.current - enemyDamagePct);
        setPlayerHpPct(newPlayerHp);
        playerHpPctRef.current = newPlayerHp;
        // Float the damage received over the player's avatar.
        const dmgAmt = playerMaxHp ? Math.max(1, Math.round(enemyDamagePct / 100 * playerMaxHp)) : enemyDamagePct;
        const pfId   = Date.now();
        setFloats((f) => [...f, { id: pfId, amount: dmgAmt, correct: false, crit: false, target: 'player' }]);
        setTimeout(() => setFloats((f) => f.filter((x) => x.id !== pfId)), 1800);
        // Faint when the actual (rounded) HP reaches 0 — not just the percentage,
        // which can sit at ~1% while displaying 0 HP.
        const actualHp = playerMaxHp ? Math.round(newPlayerHp / 100 * playerMaxHp) : newPlayerHp;
        if (actualHp <= 0) {
          handleBlackout();   // active Pokémon fainted — end battle, return to town
          return;
        }
        setPanel('moves');
        setResult(null);
        setAnswer('');
        setSelectedMove(null);
        setPuzzle(null);
      }, 1200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEnemyTypes, activePlayerTypes, enemyMaxHp, playerMaxHp, playerStats, enemyStats, handleVictory, handleBlackout, recordMathAttempt]);

  // Timer expiry — attack math
  useEffect(() => {
    if (timer > 0 || panel !== 'math' || resultRef.current !== null) return;
    const slot = moveRef.current;
    if (slot) resolveAttack(false, slot);
  }, [timer, panel, resolveAttack]);

  // Timer expiry — catch math
  useEffect(() => {
    if (timer > 0 || panel !== 'catch' || catchResult !== null) return;
    handleSubmitCatch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, panel, catchResult]);

  // ── Pick move → generate puzzle → start timer ───────────────────────────────

  function handlePickMove(slot: MoveSlot) {
    if ((movePp[slot.moveId] ?? slot.currentPp) === 0) return;
    setMovePp((prev) => ({ ...prev, [slot.moveId]: Math.max(0, (prev[slot.moveId] ?? slot.currentPp) - 1) }));

    // Persist the PP decrement to this Pokémon's stored move list (per move, per Pokémon)
    if (battle && playerPokemon) {
      const newMoves = playerPokemon.moves.map((m) =>
        m.moveId === slot.moveId ? { ...m, currentPp: Math.max(0, m.currentPp - 1) } : m,
      );
      updatePokemon(playerPokemon.instanceId, { moves: newMoves });
    }

    const puzzle       = generateBattlePuzzle(slot, activeFloor, activeEnemyTypes, 0);
    const initialTimer = puzzle.timeLimitSeconds ?? 6;

    setSelectedMove(slot);
    setPuzzle(puzzle);
    setAnswer('');
    setResult(null);
    resolvedRef.current = false;   // arm resolution for the new puzzle
    setPanel('math');
    setTimer(initialTimer);

    if (tiRef.current) clearInterval(tiRef.current);
    tiRef.current = setInterval(() => {
      setTimer((t) => { if (t <= 1) { clearInterval(tiRef.current!); return 0; } return t - 1; });
    }, 1000);

    setTimeout(() => inpRef.current?.focus(), 80);
  }

  // ── Submit answer ───────────────────────────────────────────────────────────

  function handleSubmitAnswer() {
    if (!currentPuzzle || !selectedMove || result !== null) return;
    const v = parseInt(answer, 10);
    if (isNaN(v)) return;
    resolveAttack(v === currentPuzzle.answer, selectedMove);
  }

  // ── Use potion ──────────────────────────────────────────────────────────────

  function handleUsePotion(key: keyof Potions) {
    const heal  = POTION_HEAL[key];
    const label = POTION_LABEL[key];
    setPotions((p) => ({ ...p, [key]: p[key] - 1 }));
    adjustPotions(key, -1);
    setPlayerHpPct((p) => Math.min(100, p + heal));
    setPotMsg(`${playerName} restored +${heal} HP! (${label})`);
    setTimeout(() => { setPotMsg(null); setPanel('action'); }, 1100);
  }

  // ── Ball / catch ───────────────────────────────────────────────────────────

  function handleSelectBall(ball: BallOption) {
    const puzzle = generateCatchPuzzle(ball.basePercent, enemyHpPct, activeFloor);
    setSelectedBall(ball);
    setCatchPuzzle(puzzle);
    setCatchResult(null);
    setAnswer('');
    setResult(null);
    setPanel('catch');

    const initialTimer = puzzle.timeLimitSeconds ?? 6;
    setTimer(initialTimer);
    if (tiRef.current) clearInterval(tiRef.current);
    tiRef.current = setInterval(() => {
      setTimer((t) => { if (t <= 1) { clearInterval(tiRef.current!); return 0; } return t - 1; });
    }, 1000);
    setTimeout(() => inpRef.current?.focus(), 80);
  }

  function handleSubmitCatch() {
    if (!catchPuzzle || !selectedBall || catchResult !== null) return;
    const v = parseInt(answer, 10);
    if (isNaN(v)) return;
    if (tiRef.current) clearInterval(tiRef.current);

    const correct      = v === catchPuzzle.answer;
    const accuracyMult = correct ? 1.0 : 0.75;
    const enemySpeciesCatchRate = enemySpecies?.catchRate ?? 128;
    const prob = catchProbability(enemySpeciesCatchRate, selectedBall.baseRate, enemyHpPct) * accuracyMult;
    const caught = Math.random() < prob;

    adjustPokeballs(selectedBall.consumableKey, -1);
    setResult(correct ? 'ok' : 'no');
    setCatchResult(caught ? 'caught' : 'escaped');

    if (caught) {
      setTimeout(() => {
        if (battle) {
          // Persist the active Pokémon's battle-damaged HP (catching shouldn't heal it)
          if (playerPokemon && playerMaxHp) {
            updatePokemon(playerPokemon.instanceId, {
              currentHp: Math.max(1, Math.round(playerHpPctRef.current / 100 * playerMaxHp)),
            });
          }
          addCaughtPokemon({
            speciesId: battle.enemy.speciesId,
            totalExp:  battle.enemy.totalExp,
            currentHp: battle.enemy.currentHp,
            moves:     battle.enemy.moves,
          });
          endBattle();
          navigate('/dungeon', { state: { battleOutcome: 'caught' } });
        }
      }, 1800);
    } else {
      setTimeout(() => {
        const enemyDmg = Math.max(1, Math.round(5 + Math.random() * 10));
        const newPlayerHp = Math.max(0, playerHpPctRef.current - enemyDmg);
        setPlayerHpPct(newPlayerHp);
        playerHpPctRef.current = newPlayerHp;
        const dmgAmt = playerMaxHp ? Math.max(1, Math.round(enemyDmg / 100 * playerMaxHp)) : enemyDmg;
        const pfId   = Date.now();
        setFloats((f) => [...f, { id: pfId, amount: dmgAmt, correct: false, crit: false, target: 'player' }]);
        setTimeout(() => setFloats((f) => f.filter((x) => x.id !== pfId)), 1800);
        const actualHp = playerMaxHp ? Math.round(newPlayerHp / 100 * playerMaxHp) : newPlayerHp;
        if (actualHp <= 0) {
          handleBlackout();   // active Pokémon fainted while trying to catch
          return;
        }
        setPanel('action');
        setResult(null);
        setAnswer('');
        setSelectedBall(null);
        setCatchPuzzle(null);
        setCatchResult(null);
      }, 1600);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const matchupMult  = effectiveMultiplier(activePlayerType, activeEnemyTypes);
  const matchupLabel = matchupMult === 2
    ? `×2 vs ${activeEnemyTypes[0].toUpperCase()}`
    : matchupMult === 0.5
      ? `×0.5 vs ${activeEnemyTypes[0].toUpperCase()}`
      : `×1 vs ${activeEnemyTypes[0].toUpperCase()}`;

  const isSuperEff = selectedMove
    ? effectiveMultiplier(selectedMove.type, activeEnemyTypes) > 1 && selectedMove.power > 0
    : false;

  const mathBg      = result === 'ok' ? '#0d2a10' : result === 'no' ? '#2a0d0d' : D.card;
  const totalPotions = potions.potion + potions.superPotion + potions.hyperPotion;

  // ── Render ──────────────────────────────────────────────────────────────────

  // Blackout screen — shown briefly when the active Pokémon faints, before
  // returning to town. Everything is kept; the party is healed on the way out.
  if (blackout) {
    return (
      <div className="fade-up" style={{ position: 'fixed', inset: 0, background: '#05080f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, fontFamily: FONT_UI, color: D.white, textAlign: 'center', padding: 24, zIndex: 999 }}>
        <div style={{ fontSize: 52 }}>💫</div>
        <div style={{ fontFamily: FONT_PIXEL, fontSize: 13, color: D.red, lineHeight: 1.8 }}>
          {playerName} fainted!
        </div>
        <div style={{ fontFamily: FONT_PIXEL, fontSize: 10, color: D.muted, lineHeight: 1.8 }}>
          You blacked out…
        </div>
        <div style={{ fontFamily: FONT_UI, fontSize: 12, color: D.muted, marginTop: 6 }}>
          Returning to town…
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '0 0 80px', fontFamily: FONT_UI, color: D.white }}>

      {/* Floor bar */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${D.border}` }}>
        <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>FLOOR {activeFloor}</span>
        <div style={{ flex: 1, height: 4, background: '#111', border: `1px solid ${D.border}`, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: D.yellow, transition: 'width .4s' }} />
        </div>
        <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>{encounterCurrent}/{encounterTotal}</span>
      </div>

      <div style={{ padding: '0 12px' }}>

        {/* ── Arena ── */}
        <div style={{ border: `2px solid ${D.border}`, borderRadius: 16, margin: '12px 0 10px', overflow: 'hidden' }}>

          {/* Player section — top */}
          <div style={{ background: 'linear-gradient(180deg,#1a2a0e,#0d1a06)', padding: '14px 14px 12px', borderLeft: `3px solid ${D.yellow}`, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 14, alignItems: 'center' }}>
              <img src={getSpriteUrl(playerDexNumber)} alt={playerName} style={{ width: 64, height: 64, imageRendering: 'pixelated', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.7))', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.white }}>{playerName}</span>
                  <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>Lv{playerLevel}</span>
                  <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.darker, background: D.yellow, borderRadius: 4, padding: '2px 6px', letterSpacing: 0.5 }}>LEAD</span>
                </div>
                <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                  {activePlayerTypes.map((t) => <TypeBadge key={t} type={t} />)}
                </div>
                <HPBar
                  pct={playerHpPct}
                  current={playerMaxHp ? Math.max(0, Math.round(playerHpPct / 100 * playerMaxHp)) : undefined}
                  max={playerMaxHp ?? undefined}
                />
                {/* EXP bar */}
                <div style={{ height: 3, background: '#111', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${expBarPct}%`, height: '100%', background: D.blue, transition: 'width .5s' }} />
                </div>
                {/* Focus pips — full meter = next correct hit is a 2× charged crit */}
                <div style={{ display: 'flex', gap: 4, marginTop: 7, alignItems: 'center' }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < focusPips ? D.yellow : '#111', border: `2px solid ${i < focusPips ? '#a07800' : D.border}`, boxShadow: i < focusPips ? `0 0 6px ${D.yellow}80` : 'none', transition: 'all .2s' }} />
                  ))}
                  {focusPips >= 5 ? (
                    <span className="pulsing" style={{ fontFamily: FONT_PIXEL, fontSize: 6, color: D.yellow, marginLeft: 4 }}>⚡ CHARGED!</span>
                  ) : (
                    <span style={{ fontFamily: FONT_PIXEL, fontSize: 6, color: D.muted, marginLeft: 4 }}>FOCUS</span>
                  )}
                </div>
                {playerStats && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {([
                      { label: 'Atk', val: playerStats.attack  },
                      { label: 'Def', val: playerStats.defense },
                      { label: 'Spd', val: playerStats.speed   },
                    ] as const).map(({ label, val }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: '3px 8px' }}>
                        <span style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.white }}>{val}</span>
                        <span style={{ fontFamily: FONT_UI, fontSize: 10, color: D.muted, fontWeight: 700 }}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Damage received — floats over the player avatar (top-right) */}
            {floats.filter((f) => f.target === 'player').map((f) => (
              <div key={f.id} style={{ position: 'absolute', top: 10, right: 24, fontFamily: FONT_PIXEL, fontSize: 14, fontWeight: 700, pointerEvents: 'none', color: D.red, animation: 'floatDmg 1.8s ease-out forwards', textShadow: '0 2px 6px #000', zIndex: 10, textAlign: 'right' }}>
                -{f.amount}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 3, background: 'linear-gradient(90deg,#1a3a6a,#2a4a10,#1a3a6a)' }} />

          {/* Enemy section — bottom */}
          <div style={{ background: 'linear-gradient(180deg,#1a3a6a,#0d2040)', padding: '10px 14px 14px', position: 'relative' }}>
            <div style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted, letterSpacing: 1.5, marginBottom: 8, opacity: 0.7 }}>
              WILD POKÉMON
            </div>
            <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 14, alignItems: 'center' }}>
              <img src={getSpriteUrl(enemyDexNumber)} alt={enemyName} style={{ width: 72, height: 72, imageRendering: 'pixelated', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.7))', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: FONT_PIXEL, fontSize: 10, color: D.white }}>{enemyName}</span>
                  <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>Lv{enemyLevel}</span>
                </div>
                <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                  {activeEnemyTypes.map((t) => <TypeBadge key={t} type={t} />)}
                </div>
                <HPBar
                  pct={enemyHpPct}
                  current={enemyMaxHp ? Math.max(0, Math.round(enemyHpPct / 100 * enemyMaxHp)) : undefined}
                  max={enemyMaxHp ?? undefined}
                />
                {enemyStats && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {([
                      { label: 'Atk', val: enemyStats.attack  },
                      { label: 'Def', val: enemyStats.defense },
                      { label: 'Spd', val: enemyStats.speed   },
                    ] as const).map(({ label, val }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: '3px 8px' }}>
                        <span style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.white }}>{val}</span>
                        <span style={{ fontFamily: FONT_UI, fontSize: 10, color: D.muted, fontWeight: 700 }}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Damage dealt — floats over the enemy avatar */}
            {floats.filter((f) => f.target === 'enemy').map((f) => (
              <div key={f.id} style={{ position: 'absolute', top: 10, right: 20, fontFamily: FONT_PIXEL, fontSize: f.crit ? 18 : 14, fontWeight: 700, pointerEvents: 'none', color: f.crit ? '#ff7b00' : f.correct ? D.yellow : D.red, animation: 'floatDmg 1.8s ease-out forwards', textShadow: '0 2px 6px #000', zIndex: 10, textAlign: 'right' }}>
                {f.crit && <div style={{ fontSize: 8, color: '#ff7b00' }}>⚡CRITICAL!</div>}
                -{f.amount}
              </div>
            ))}
            {/* Status-move message */}
            {statusMsg && (
              <div className="fade-up" style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', fontFamily: FONT_PIXEL, fontSize: 8, color: D.white, background: 'rgba(0,0,0,.7)', border: `1px solid ${D.yellow}`, borderRadius: 6, padding: '4px 8px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 11 }}>
                {statusMsg}
              </div>
            )}
          </div>

        </div>

        {/* Matchup bar */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: '8px 12px', marginBottom: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.yellow }}>{playerSpecies?.types[0] ?? '⚡'} {matchupLabel}</span>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>YOU GO FIRST</span>
        </div>

        {/* ── ACTION PANEL ── */}
        {panel === 'action' && (
          <div className="fade-up">
            <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.muted, marginBottom: 10 }}>What will {playerName} do?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                { label: 'FIGHT',               icon: '⚔️', img: undefined,                       col: typeColors('Fire').fg,  bg: typeColors('Fire').bg,  bdr: typeColors('Fire').bdr,  action: () => setPanel('moves')  },
                { label: 'BALL',                icon: '🔴', img: getBallSpriteUrl('pokeball'),    col: typeColors('Water').fg, bg: typeColors('Water').bg, bdr: typeColors('Water').bdr, action: () => setPanel('ball')   },
                { label: `POTION ×${totalPotions}`, icon: '🧪', img: getItemSpriteUrl('potion'),  col: D.green, bg: '#0a1a0a', bdr: '#1a4020',                                          action: () => setPanel('potion') },
                { label: 'FLEE',                icon: '🏃', img: undefined,                       col: D.muted,               bg: D.card2,                 bdr: D.border,               action: handleFlee               },
              ] as const).map((btn, i) => (
                <button key={i} onClick={btn.action} style={{ background: btn.bg, border: `2px solid ${btn.bdr}`, borderRadius: 12, padding: '14px 10px', cursor: 'pointer', fontFamily: FONT_UI, fontSize: 14, fontWeight: 900, color: btn.col, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'opacity .15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '.8')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
                  {btn.img
                    ? <img src={btn.img} alt={btn.label} style={{ width: 26, height: 26, imageRendering: 'pixelated', objectFit: 'contain' }} />
                    : <span style={{ fontSize: 22 }}>{btn.icon}</span>}
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── MOVE PANEL ── */}
        {panel === 'moves' && (
          <div className="fade-up">
            <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.muted, marginBottom: 8 }}>Choose a move</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {activeMoves.map((slot) => {
                const currentPp = movePp[slot.moveId] ?? slot.currentPp;
                const outOfPp   = currentPp === 0;
                const tc        = typeColors(slot.type);
                const superEff  = effectiveMultiplier(slot.type, activeEnemyTypes) > 1 && slot.power > 0;
                return (
                  <button key={slot.moveId} onClick={() => handlePickMove(slot)} disabled={outOfPp} style={{ background: tc.bg, border: `2px solid ${tc.bdr}`, borderRadius: 12, padding: '10px 12px', cursor: outOfPp ? 'not-allowed' : 'pointer', textAlign: 'left', fontFamily: FONT_UI, transition: 'all .15s', opacity: outOfPp ? 0.35 : 1, position: 'relative' }}
                    onMouseEnter={(e) => { if (!outOfPp) { e.currentTarget.style.opacity = '.8'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = outOfPp ? '0.35' : '1'; e.currentTarget.style.transform = 'none'; }}>
                    {superEff && <div style={{ position: 'absolute', top: 5, right: 5, fontFamily: FONT_PIXEL, fontSize: 6, color: '#CC0000', background: '#fff', borderRadius: 4, padding: '1px 4px', border: '1px solid #CC0000' }}>★</div>}
                    <div style={{ fontSize: 13, fontWeight: 800, color: tc.fg, marginBottom: 5 }}>{slot.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <TypeBadge type={slot.type} />
                      <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted }}>PP {currentPp}/{slot.maxPp}</span>
                    </div>
                    <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>{slot.power > 0 ? `PWR ${slot.power}` : 'STATUS'}</span>
                  </button>
                );
              })}
            </div>
            <BackBtn onClick={() => setPanel('action')} />
          </div>
        )}

        {/* ── MATH PUZZLE PANEL ── */}
        {panel === 'math' && selectedMove && currentPuzzle && (
          <div className="fade-up" style={{ background: mathBg, border: `3px solid ${D.yellow}`, borderRadius: 16, padding: 16, boxShadow: `4px 4px 0 ${D.yellow}40`, transition: 'background .4s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <TypeBadge type={selectedMove.type} large />
                  <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>{selectedMove.name.toUpperCase()}</span>
                </div>
                <div style={{ fontFamily: FONT_PIXEL, fontSize: 19, color: D.yellow, lineHeight: 1.8 }}>{currentPuzzle.equation}</div>
                {isSuperEff && <div className="supereff-badge" style={{ marginTop: 8 }}>SUPER EFFECTIVE!</div>}
              </div>
              {/* Timer */}
              <div style={{ textAlign: 'center', minWidth: 44, flexShrink: 0 }}>
                <div style={{ fontFamily: FONT_PIXEL, fontSize: 24, lineHeight: 1.2, color: timer <= 2 ? D.red : timer <= 4 ? D.yellow : D.white, ...(timer <= 2 ? { animation: 'timerPulse .4s ease-in-out infinite' } : {}) }}>
                  {timer}
                </div>
                <div style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted, marginTop: 2 }}>SEC</div>
                <div style={{ width: 38, height: 4, background: '#111', border: `1px solid ${D.border}`, borderRadius: 2, margin: '5px auto 0', overflow: 'hidden' }}>
                  <div style={{ width: `${(timer / (currentPuzzle.timeLimitSeconds ?? 6)) * 100}%`, height: '100%', background: D.yellow, transition: 'width 1s linear' }} />
                </div>
              </div>
            </div>

            <input ref={inpRef} type="number" value={answer} placeholder="?" inputMode="numeric"
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
              style={{ width: '100%', fontFamily: FONT_PIXEL, fontSize: 22, textAlign: 'center', background: result === 'ok' ? '#0a1a0a' : result === 'no' ? '#1a0a0a' : D.darker, color: D.white, border: `2px solid ${result === 'ok' ? D.green : result === 'no' ? D.red : D.border2}`, borderRadius: 10, padding: 12, outline: 'none', transition: 'all .2s', boxSizing: 'border-box' }}
            />

            {result ? (
              <div style={{ textAlign: 'center', fontFamily: FONT_PIXEL, fontSize: 10, marginTop: 10, color: result === 'ok' ? D.green : D.red }}>
                {selectedMove && selectedMove.power === 0
                  ? (result === 'ok' ? 'CORRECT! Full effect!' : 'WRONG! Weak effect...')
                  : (result === 'ok' ? 'CORRECT! Full power!'  : 'WRONG! 75% power...')}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 10 }}>
                <button onClick={handleSubmitAnswer} style={{ padding: '12px 14px', fontFamily: FONT_UI, fontSize: 14, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: 0.5, background: D.yellow, color: D.darker, border: '2px solid rgba(0,0,0,.15)', borderRadius: 12, cursor: 'pointer', boxShadow: '0 4px 0 #a07800' }}>ATTACK!</button>
                <button onClick={() => { if (tiRef.current) clearInterval(tiRef.current); setPanel('moves'); }} style={{ padding: '12px 14px', fontFamily: FONT_UI, fontSize: 14, fontWeight: 900, background: 'transparent', color: D.muted, border: `2px solid ${D.border}`, borderRadius: 12, cursor: 'pointer' }}>←</button>
              </div>
            )}
          </div>
        )}

        {/* ── POTION PANEL ── */}
        {panel === 'potion' && (
          <div className="fade-up">
            <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.muted, marginBottom: 8 }}>Use a Potion — costs your turn</div>
            {([
              { key: 'potion'      as const, name: 'Potion',       heal: 20,  count: potions.potion      },
              { key: 'superPotion' as const, name: 'Super Potion', heal: 60,  count: potions.superPotion },
              { key: 'hyperPotion' as const, name: 'Hyper Potion', heal: 120, count: potions.hyperPotion },
            ]).map((p) => (
              <button key={p.key} onClick={() => p.count > 0 && handleUsePotion(p.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: D.card, border: `2px solid ${p.count > 0 ? D.green : D.border}`, borderRadius: 14, padding: '12px 14px', cursor: p.count > 0 ? 'pointer' : 'not-allowed', marginBottom: 8, fontFamily: FONT_UI, opacity: p.count > 0 ? 1 : 0.4, transition: 'all .15s' }}>
                <img src={getItemSpriteUrl(p.key)} alt={p.name} style={{ width: 38, height: 38, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: D.green, fontWeight: 700 }}>Restores +{p.heal} HP</div>
                </div>
                <div style={{ fontFamily: FONT_PIXEL, fontSize: 11 }}>×{p.count}</div>
              </button>
            ))}
            {potMsg && <div style={{ fontFamily: FONT_PIXEL, fontSize: 10, textAlign: 'center', color: D.green, padding: 8 }}>{potMsg}</div>}
            <BackBtn onClick={() => setPanel('action')} />
          </div>
        )}

        {/* ── BALL PANEL ── */}
        {panel === 'ball' && (() => {
          const zone     = hpZone(enemyHpPct);
          const zoneCol  = zone === 'red' ? D.red : zone === 'orange' ? D.yellow : D.green;
          const zoneLabel = zone === 'red' ? 'Low HP — high catch!' : zone === 'orange' ? 'Half HP — better chance' : 'High HP — low chance';
          const ballCounts: Record<string, number> = {
            'Poké Ball':  trainer.pokeballs.pokeball  ?? 0,
            'Great Ball': trainer.pokeballs.greatBall ?? 0,
            'Ultra Ball': trainer.pokeballs.ultraBall ?? 0,
          };
          return (
            <div className="fade-up">
              <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.muted, marginBottom: 8 }}>Throw a Poké Ball</div>
              {/* HP zone indicator */}
              <div style={{ background: D.card, border: `1px solid ${zoneCol}`, borderRadius: 10, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: zoneCol, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: zoneCol }}>{zoneLabel}</span>
              </div>
              {BALLS.map((ball) => {
                const count = ballCounts[ball.name] ?? 0;
                const tc = typeColors('Water');
                return (
                  <button key={ball.name} onClick={() => count > 0 && handleSelectBall(ball)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: D.card, border: `2px solid ${count > 0 ? D.border : D.border}`, borderRadius: 14, padding: '12px 14px', cursor: count > 0 ? 'pointer' : 'not-allowed', marginBottom: 8, fontFamily: FONT_UI, opacity: count > 0 ? 1 : 0.35, transition: 'border-color .15s' }}
                    onMouseEnter={(e) => { if (count > 0) e.currentTarget.style.borderColor = tc.fg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = D.border; }}>
                    <img src={getBallSpriteUrl(ball.consumableKey)} alt={ball.name} style={{ width: 38, height: 38, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{ball.name}</div>
                      <div style={{ fontSize: 12, color: tc.fg, fontWeight: 700 }}>Base catch rate: {ball.basePercent}%</div>
                    </div>
                    <div style={{ fontFamily: FONT_PIXEL, fontSize: 11 }}>×{count}</div>
                  </button>
                );
              })}
              <BackBtn onClick={() => setPanel('action')} />
            </div>
          );
        })()}

        {/* ── CATCH PUZZLE PANEL ── */}
        {panel === 'catch' && selectedBall && catchPuzzle && (() => {
          const zone    = hpZone(enemyHpPct);
          const zoneCol = zone === 'red' ? D.red : zone === 'orange' ? D.yellow : D.green;
          const bgColor = catchResult === 'caught' ? '#0d2a10' : catchResult === 'escaped' ? '#2a0d0d' : result === 'ok' ? '#0d2a10' : result === 'no' ? '#2a0d0d' : D.card;
          return (
            <div className="fade-up" style={{ background: bgColor, border: `3px solid ${D.yellow}`, borderRadius: 16, padding: 16, boxShadow: `4px 4px 0 ${D.yellow}40`, transition: 'background .4s' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <img src={getBallSpriteUrl(selectedBall.consumableKey)} alt={selectedBall.name} style={{ width: 22, height: 22, imageRendering: 'pixelated', objectFit: 'contain' }} />
                    <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>{selectedBall.name.toUpperCase()}</span>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: zoneCol, display: 'inline-block' }} />
                  </div>
                  <div style={{ fontFamily: FONT_PIXEL, fontSize: 19, color: D.yellow, lineHeight: 1.8 }}>{catchPuzzle.equation}</div>
                  <div style={{ fontSize: 12, color: D.muted, fontWeight: 700, marginTop: 6 }}>
                    Ball% + HP bonus% = effective catch rate
                  </div>
                </div>
                {/* Timer */}
                {!catchResult && (
                  <div style={{ textAlign: 'center', minWidth: 44, flexShrink: 0 }}>
                    <div style={{ fontFamily: FONT_PIXEL, fontSize: 24, lineHeight: 1.2, color: timer <= 2 ? D.red : timer <= 4 ? D.yellow : D.white, ...(timer <= 2 ? { animation: 'timerPulse .4s ease-in-out infinite' } : {}) }}>{timer}</div>
                    <div style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted, marginTop: 2 }}>SEC</div>
                    <div style={{ width: 38, height: 4, background: '#111', border: `1px solid ${D.border}`, borderRadius: 2, margin: '5px auto 0', overflow: 'hidden' }}>
                      <div style={{ width: `${(timer / (catchPuzzle.timeLimitSeconds ?? 6)) * 100}%`, height: '100%', background: D.yellow, transition: 'width 1s linear' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Result or input */}
              {catchResult ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{catchResult === 'caught' ? '🎉' : '💨'}</div>
                  <div style={{ fontFamily: FONT_PIXEL, fontSize: 11, color: catchResult === 'caught' ? D.green : D.red }}>
                    {catchResult === 'caught' ? `${enemyName} caught!` : 'It escaped!'}
                  </div>
                  {catchResult === 'caught' && (
                    <div style={{ fontSize: 12, color: D.muted, marginTop: 8, fontWeight: 700 }}>Sent to PC Box →</div>
                  )}
                </div>
              ) : (
                <>
                  <input ref={inpRef} type="number" value={answer} placeholder="?" inputMode="numeric"
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitCatch()}
                    style={{ width: '100%', fontFamily: FONT_PIXEL, fontSize: 22, textAlign: 'center', background: D.darker, color: D.white, border: `2px solid ${D.border2}`, borderRadius: 10, padding: 12, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 10 }}>
                    <button onClick={handleSubmitCatch} style={{ padding: '12px 14px', fontFamily: FONT_UI, fontSize: 14, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: 0.5, background: D.yellow, color: D.darker, border: '2px solid rgba(0,0,0,.15)', borderRadius: 12, cursor: 'pointer', boxShadow: '0 4px 0 #a07800' }}>THROW!</button>
                    <button onClick={() => { if (tiRef.current) clearInterval(tiRef.current); setPanel('ball'); }} style={{ padding: '12px 14px', fontFamily: FONT_UI, fontSize: 14, fontWeight: 900, background: 'transparent', color: D.muted, border: `2px solid ${D.border}`, borderRadius: 12, cursor: 'pointer' }}>←</button>
                  </div>
                </>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );
}
