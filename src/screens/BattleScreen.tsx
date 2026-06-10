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
import { calcHp, calcAllStats, calcDamage, catchProbability, hpZone, expGained, levelFromExp, expToLevel } from '../lib/formulas';
import { getSpriteUrl, getBallSpriteUrl, getItemSpriteUrl } from '../lib/sprites';
import RarityBadge from '../components/RarityBadge';
import { generateBattlePuzzle, effectiveMultiplier, getTypeMultiplier } from '../lib/mathProblemGenerator';
import { useBattleStore }  from '../store/battleStore';
import { useGameStore, useActiveTrainer, getPartyPokemon }    from '../store/gameStore';
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

type Panel = 'moves' | 'math' | 'potion' | 'ball' | 'catch';

export default function BattleScreen() {
  const navigate = useNavigate();

  // ── Store reads ─────────────────────────────────────────────────────────────
  const battle    = useBattleStore((s) => s.battle);
  const endBattle = useBattleStore((s) => s.endBattle);

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

  const party        = getPartyPokemon(trainer);

  // ── Derive active context (real vs demo) ────────────────────────────────────
  const playerPokemon  = party.find((p) => p.instanceId === battle?.activePlayerInstanceId) ?? null;
  const playerSpecies  = playerPokemon ? getSpecies(playerPokemon.speciesId) : null;
  const enemySpecies   = battle ? getSpecies(battle.enemy.speciesId) : null;

  const activeEnemyTypes  = (battle && enemySpecies ? enemySpecies.types  : DEMO_ENEMY_TYPES)  as readonly PokeType[];
  const activePlayerTypes = (playerSpecies          ? playerSpecies.types  : [DEMO_PLAYER_TYPE]) as readonly PokeType[];

  // Derive level from totalExp
  const playerLevel = playerPokemon ? levelFromExp(playerPokemon.totalExp) : 24;
  const enemyLevel  = battle ? levelFromExp(battle.enemy.totalExp) : 22;

  const enemyStats  = enemySpecies  && battle          ? calcAllStats(enemySpecies.baseStats,  enemyLevel)      : null;
  const playerStats = playerSpecies && playerPokemon    ? calcAllStats(playerSpecies.baseStats, playerLevel)     : null;

  const enemyMaxHp     = enemyStats?.maxHp ?? null;
  const playerMaxHp    = playerStats?.maxHp ?? null;

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
  // Focus is a persisted trainer property — start the battle from the saved value.
  const initFocusPips = battle ? (trainer.focus ?? 0) : 2;

  // Display info
  const playerName      = playerSpecies?.name.toUpperCase() ?? 'PIKACHU';
  const playerDexNumber = playerSpecies?.dexNumber ?? 25;
  const playerRarity    = playerSpecies?.rarity ?? 'Uncommon';
  const enemyName       = enemySpecies?.name.toUpperCase() ?? 'GYARADOS';
  const enemyDexNumber  = enemySpecies?.dexNumber ?? 130;
  const enemyRarity     = enemySpecies?.rarity ?? 'Rare';

  const expBarPct = (() => {
    if (!playerPokemon) return 62;
    const lvl = levelFromExp(playerPokemon.totalExp);
    const range = expToLevel(lvl + 1) - expToLevel(lvl);
    const progress = playerPokemon.totalExp - expToLevel(lvl);
    return range > 0 ? Math.max(0, Math.min(100, Math.round((progress / range) * 100))) : 0;
  })();
  // EXP remaining until the next level (matches the dungeon party card).
  const expToNext = playerPokemon
    ? Math.max(0, expToLevel(levelFromExp(playerPokemon.totalExp) + 1) - playerPokemon.totalExp)
    : 0;

  // ── Component state ─────────────────────────────────────────────────────────
  const [panel, setPanel]               = useState<Panel>('moves');
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
  // Banner attributing the wild Pokémon's hit (so an enemy-first strike never
  // looks like the player damaging themselves).
  const [enemyTurnMsg, setEnemyTurnMsg] = useState<string | null>(null);
  // UI mirrors of the status-move stat modifiers so the Atk/Def chips visibly
  // change. The refs (below) drive the damage math; these drive the display.
  const [enemyAtkMult,  setEnemyAtkMult]  = useState(1);
  const [enemyDefMult,  setEnemyDefMult]  = useState(1);
  const [playerDefMult, setPlayerDefMult] = useState(1);
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
  // Party carousel: switching is locked until a faster enemy's opening strike has
  // landed, so that strike always hits the Pokémon the player entered with.
  const [canSwitch, setCanSwitch]       = useState(playerGoesFirst);
  // Track enemy HP in a ref to read synchronously inside resolveAttack
  const enemyHpRef = useRef(initEnemyHp);

  const tiRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const inpRef       = useRef<HTMLInputElement>(null);
  const moveRef      = useRef<MoveSlot | null>(null);
  const resultRef    = useRef<'ok' | 'no' | null>(null);
  const focusPipsRef = useRef(initFocusPips);
  const playerHpPctRef = useRef(initPlayerHp);
  // Mid-battle party switching: mirror of the active fighter id + a per-member
  // HP% stash so each Pokémon's HP is preserved as the player flips the carousel.
  const activeIdRef = useRef(battle?.activePlayerInstanceId ?? '');
  const hpStashRef  = useRef<Record<string, number>>({});
  const seededRef   = useRef(false);
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
  // EXP is awarded incrementally as damage is dealt: each hit grants
  // (totalEnemyExp × HP-fraction-removed) to the Pokémon that dealt it. This ref
  // accumulates the per-Pokémon totals (keyed by instanceId) for the end-of-battle
  // summary. The EXP is persisted to game state immediately on every hit, so a
  // Pokémon keeps what it earned even if the enemy is later caught. Spec §4.7.
  const expAccRef = useRef<Record<string, { name: string; dexNumber: number; expAdded: number; oldLevel: number }>>({});

  useEffect(() => { moveRef.current      = selectedMove; }, [selectedMove]);
  useEffect(() => { resultRef.current    = result; }, [result]);
  useEffect(() => { puzzleRef.current    = currentPuzzle; }, [currentPuzzle]);
  useEffect(() => { focusPipsRef.current = focusPips; }, [focusPips]);
  // Persist the Focus meter to the trainer so it survives battles + sessions.
  useEffect(() => { if (battle) setFocus(focusPips); }, [focusPips, battle, setFocus]);
  useEffect(() => { playerHpPctRef.current = playerHpPct; }, [playerHpPct]);
  useEffect(() => () => { if (tiRef.current) clearInterval(tiRef.current); }, []);

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
      hpStashRef.current[id] = maxHp > 0 ? Math.min(100, Math.max(0, Math.round(pk.currentHp / maxHp * 100))) : 0;
    }
  }, [battle]);

  // Keep the active-fighter id mirror in sync as the player switches.
  useEffect(() => { if (battle) activeIdRef.current = battle.activePlayerInstanceId; }, [battle]);

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
    store.updatePokemon(instanceId, { totalExp: pk.totalExp + expShare });
  }, []);

  // Build the end-of-battle EXP summary from everything awarded this battle,
  // reading each Pokémon's final level fresh from game state.
  const buildExpGains = useCallback(() => {
    const store = useGameStore.getState();
    const t = store.trainers.find((x) => x.id === store.activeTrainerId);
    return Object.entries(expAccRef.current).map(([instanceId, rec]) => {
      const pk = t?.caughtPokemon.find((p) => p.instanceId === instanceId);
      const newLevel = pk ? levelFromExp(pk.totalExp) : rec.oldLevel;
      return { instanceId, name: rec.name, dexNumber: rec.dexNumber, expAdded: rec.expAdded, oldLevel: rec.oldLevel, newLevel };
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
    setResult(null);
    setSelectedMove(null);
    setPuzzle(null);
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

    const pokeReward = Math.floor(enemyLevel * 12);
    const expGains   = buildExpGains();
    gs.earnPokeDollars(pokeReward);
    endBattle();
    navigate('/dungeon', { state: { battleOutcome: 'victory', expGains, pokeReward } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endBattle, navigate, enemyLevel, buildExpGains, persistAllHp]);

  const handleFlee = useCallback(() => {
    if (useBattleStore.getState().battle) persistAllHp();
    endBattle();
    navigate('/dungeon', { state: { battleOutcome: 'fled' } });
  }, [endBattle, navigate, persistAllHp]);

  // ── Blackout — active Pokémon fainted ────────────────────────────────────────
  // Shows a brief blackout screen, then returns to town. Everything is kept
  // (caught Pokémon, Pokédollars). The fainted Pokémon is persisted at 0 HP, so
  // the player sees it must be healed at the Pokémon Center before battling again.
  const handleBlackout = useCallback(() => {
    if (tiRef.current) clearInterval(tiRef.current);
    // Every party member has fainted — persist them all (at 0 HP).
    if (useBattleStore.getState().battle) persistAllHp();
    setBlackout(true);
    setTimeout(() => {
      endBattle();
      navigate('/', { state: { blackedOut: true } });
    }, 2200);
  }, [endBattle, navigate, persistAllHp]);

  // ── Enemy attack ─────────────────────────────────────────────────────────────
  // The wild Pokémon strikes the player. Applies damage, shows the attribution
  // banner + float, and returns whether the player fainted. Used both for the
  // per-turn counterattack and the faster-enemy opening strike.
  const enemyAttack = useCallback((): boolean => {
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
    hpStashRef.current[activeIdRef.current] = newPlayerHp;   // keep the stash in sync
    // Attribute the hit to the wild Pokémon so it never reads as self-damage.
    setEnemyTurnMsg(`Wild ${enemyName} attacked!`);
    setTimeout(() => setEnemyTurnMsg(null), 1400);
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
  }, [enemyStats, playerStats, playerMaxHp, enemyLevel, enemyName]);

  // ── Faster-enemy opening strike ──────────────────────────────────────────────
  // When the wild Pokémon is faster it gets one free hit at the very start of the
  // battle — clearly the enemy "going first" — before the player acts. Thereafter
  // every turn is the intuitive player-attacks-then-enemy-counters loop, so the
  // player's own move never appears to damage themselves.
  const openingStrikeRef = useRef(false);
  useEffect(() => {
    if (!battle || playerGoesFirst) return;
    const t = setTimeout(() => {
      if (openingStrikeRef.current) return;   // fire exactly once (StrictMode-safe)
      openingStrikeRef.current = true;
      // The strike hits the Pokémon the player entered with (still the active one,
      // since switching is locked until now).
      if (enemyAttack()) {
        const next = firstAlive(activeIdRef.current);
        if (next) switchTo(next); else handleBlackout();
      }
      setCanSwitch(true);   // unlock the carousel now the opening strike has landed
    }, 650);
    return () => clearTimeout(t);
  }, [battle, playerGoesFirst, enemyAttack, handleBlackout, firstAlive, switchTo]);

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

    // ── The player's hit — applies status effect, enemy damage, EXP, focus,
    //    the damage float and records the math attempt. Returns whether the
    //    enemy fainted.
    const performPlayerHit = (): boolean => {
      // Status move — additionally apply its battle stat modifier + show a message.
      if (slot.power === 0) {
        const eff    = statusEffectFor(slot.moveId);
        const factor = softenFactor(eff.factor, correct);
        if (eff.target === 'enemyAtk')  { enemyAtkMultRef.current  *= factor; setEnemyAtkMult(enemyAtkMultRef.current); }
        if (eff.target === 'enemyDef')  { enemyDefMultRef.current  *= factor; setEnemyDefMult(enemyDefMultRef.current); }
        if (eff.target === 'playerDef') { playerDefMultRef.current *= factor; setPlayerDefMult(playerDefMultRef.current); }
        setStatusMsg(correct ? eff.msg : `${eff.msg} (weak)`);
        setTimeout(() => setStatusMsg(null), 1400);
      }

      const oldEnemyHp = enemyHpRef.current;
      const newEnemyHp = Math.max(0, oldEnemyHp - damagePct);
      if (damagePct > 0) {
        setEnemyHpPct(newEnemyHp);
        enemyHpRef.current = newEnemyHp;
      }

      // Award EXP immediately for the HP fraction actually removed (capped at the
      // enemy's remaining HP), proportional to the enemy's total EXP value. The
      // attacker is the currently-active Pokémon. Sum across all hits ≈ full reward.
      const hpFractionRemoved = oldEnemyHp - newEnemyHp;   // 0–100 (% of max HP)
      if (hpFractionRemoved > 0) {
        const totalExpReward = expGained(enemySpecies?.baseExp ?? 64, enemyLevel);
        awardExp(Math.round(totalExpReward * hpFractionRemoved / 100));
      }

      setFocusPips(isCrit ? 0 : correct ? Math.min(5, focusPipsRef.current + 1) : 0);

      if (damagePct > 0) {
        const floatId = Date.now();
        setFloats((f) => [...f, { id: floatId, amount: damage, correct, crit: isCrit, target: 'enemy' }]);
        setTimeout(() => setFloats((f) => f.filter((x) => x.id !== floatId)), 1800);
      }

      // Record the math attempt against the active puzzle's topic
      recordMathAttempt(puzzleRef.current?.topic ?? ('addition' as MathTopic), correct);

      return newEnemyHp <= 0;
    };

    const nextTurn = () => {
      setPanel('moves');
      setResult(null);
      setAnswer('');
      setSelectedMove(null);
      setPuzzle(null);
    };

    // The player always initiates each turn by solving the puzzle, so their move
    // lands first; the wild Pokémon then counterattacks. (A faster enemy already
    // took its extra hit as the opening strike at the start of the battle.)
    if (performPlayerHit()) {
      setTimeout(handleVictory, 1200);   // enemy fainted — player wins outright
      return;
    }
    setTimeout(() => {
      if (enemyAttack()) {
        // Active Pokémon fainted — send out the next healthy one, or black out.
        const next = firstAlive(activeIdRef.current);
        if (next) switchTo(next); else handleBlackout();
        return;
      }
      nextTurn();
    }, 1200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEnemyTypes, activePlayerTypes, enemyMaxHp, playerMaxHp, playerStats, enemyStats, handleVictory, handleBlackout, recordMathAttempt, awardExp, enemyAttack, firstAlive, switchTo]);

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
    if (slot.currentPp === 0) return;

    // Persist the PP decrement to this Pokémon's stored move list (per move, per Pokémon)
    if (battle && playerPokemon) {
      const newMoves = playerPokemon.moves.map((m) =>
        m.moveId === slot.moveId ? { ...m, currentPp: Math.max(0, m.currentPp - 1) } : m,
      );
      updatePokemon(playerPokemon.instanceId, { moves: newMoves });
    }

    const puzzle       = generateBattlePuzzle(enemyLevel);
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
    // Catch challenges use the same level-scaled difficulty as battle attacks.
    const puzzle = generateBattlePuzzle(enemyLevel);
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
          // Persist every party member's battle HP (catching shouldn't heal them).
          persistAllHp();
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
        hpStashRef.current[activeIdRef.current] = newPlayerHp;
        setEnemyTurnMsg(`Wild ${enemyName} attacked!`);
        setTimeout(() => setEnemyTurnMsg(null), 1400);
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
        setAnswer('');
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

  const mathBg      = result === 'ok' ? '#0d2a10' : result === 'no' ? '#2a0d0d' : D.card;
  const totalPotions = potions.potion + potions.superPotion + potions.hyperPotion;

  // Whether this wild species is already registered in the player's collection —
  // shown in the ball-throwing view so the player knows if it's a new catch.
  const alreadyCaught = !!battle && trainer.caughtPokemon.some((p) => p.speciesId === battle.enemy.speciesId);

  // ── Party carousel ───────────────────────────────────────────────────────────
  const activeId      = battle?.activePlayerInstanceId ?? '';
  const activeIdx     = party.findIndex((p) => p.instanceId === activeId);
  const hasParty      = party.length > 1 && activeIdx >= 0;
  const prevId        = hasParty ? party[(activeIdx - 1 + party.length) % party.length].instanceId : null;
  const nextId        = hasParty ? party[(activeIdx + 1) % party.length].instanceId : null;
  // Switching is allowed only on the move-select view, once the opening strike (if
  // any) has landed.
  const switchEnabled = hasParty && panel === 'moves' && canSwitch;

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
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '12px 0 80px', fontFamily: FONT_UI, color: D.white }}>

      <div style={{ padding: '0 12px' }}>

        {/* ── Opponent panel (top) ── */}
        <div style={{ border: `2px solid ${D.border}`, borderRadius: 16, margin: '12px 0 8px', overflow: 'hidden', background: 'linear-gradient(180deg,#1a3a6a,#0d2040)', position: 'relative' }}>
          <div style={{ padding: '10px 14px 14px' }}>
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
                <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {activeEnemyTypes.map((t) => <TypeBadge key={t} type={t} />)}
                  <RarityBadge rarity={enemyRarity} />
                </div>
                <HPBar
                  pct={enemyHpPct}
                  current={enemyMaxHp ? Math.max(0, Math.round(enemyHpPct / 100 * enemyMaxHp)) : undefined}
                  max={enemyMaxHp ?? undefined}
                />
                {enemyStats && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {([
                      { label: 'Atk', val: Math.round(enemyStats.attack  * enemyAtkMult), col: enemyAtkMult < 1 ? D.red : D.white },
                      { label: 'Def', val: Math.round(enemyStats.defense * enemyDefMult), col: enemyDefMult < 1 ? D.red : D.white },
                      { label: 'Spd', val: enemyStats.speed,                              col: D.white },
                    ] as const).map(({ label, val, col }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: '3px 8px' }}>
                        <span style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: col }}>{val}</span>
                        <span style={{ fontFamily: FONT_UI, fontSize: 10, color: D.muted, fontWeight: 700 }}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

        {/* ── Trainer Focus meter (battle-wide; carries across switches) ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: D.card, border: `1px solid ${focusPips >= 5 ? D.yellow : D.border}`, borderRadius: 10, padding: '7px 12px', margin: '0 0 8px' }}>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted, letterSpacing: 1, flexShrink: 0 }}>FOCUS</span>
          <div style={{ display: 'flex', gap: 6, flex: 1 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: i < focusPips ? D.yellow : '#111', border: `2px solid ${i < focusPips ? '#a07800' : D.border}`, boxShadow: i < focusPips ? `0 0 6px ${D.yellow}80` : 'none', transition: 'all .2s' }} />
            ))}
          </div>
          {focusPips >= 5
            ? <span className="pulsing" style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.yellow, flexShrink: 0 }}>⚡ CHARGED!</span>
            : <span style={{ fontFamily: FONT_PIXEL, fontSize: 6, color: D.muted, flexShrink: 0 }}>{focusPips}/5</span>}
        </div>

        {/* ── My Pokémon panel (below) — carousel + moves ── */}
        <div style={{ border: `2px solid ${D.border}`, borderRadius: 16, margin: '0 0 10px', overflow: 'hidden', background: 'linear-gradient(180deg,#1a2a0e,#0d1a06)', borderLeft: `3px solid ${D.yellow}` }}>

          {/* Header — details + carousel; arrows centre on this region only */}
          <div style={{ position: 'relative' }}>

          {/* Carousel arrows */}
          {hasParty && (
            <>
              <button onClick={() => prevId && switchTo(prevId)} disabled={!switchEnabled} aria-label="Previous Pokémon"
                style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', width: 30, height: 48, borderRadius: 10, background: 'rgba(0,0,0,.4)', border: `1px solid ${D.border}`, color: switchEnabled ? D.white : '#3a4a2a', fontSize: 22, fontWeight: 900, lineHeight: 1, cursor: switchEnabled ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 12, opacity: switchEnabled ? 1 : 0.35 }}>‹</button>
              <button onClick={() => nextId && switchTo(nextId)} disabled={!switchEnabled} aria-label="Next Pokémon"
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 30, height: 48, borderRadius: 10, background: 'rgba(0,0,0,.4)', border: `1px solid ${D.border}`, color: switchEnabled ? D.white : '#3a4a2a', fontSize: 22, fontWeight: 900, lineHeight: 1, cursor: switchEnabled ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 12, opacity: switchEnabled ? 1 : 0.35 }}>›</button>
            </>
          )}

          <div key={activeId} className="fade-up" style={{ padding: hasParty ? '14px 38px 12px' : '14px 14px 12px' }}>
            <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 14, alignItems: 'center' }}>
              <img src={getSpriteUrl(playerDexNumber)} alt={playerName} style={{ width: 64, height: 64, imageRendering: 'pixelated', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.7))', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.white }}>{playerName}</span>
                  <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>Lv{playerLevel}</span>
                </div>
                <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {activePlayerTypes.map((t) => <TypeBadge key={t} type={t} />)}
                  <RarityBadge rarity={playerRarity} />
                </div>
                <HPBar
                  pct={playerHpPct}
                  current={playerMaxHp ? Math.max(0, Math.round(playerHpPct / 100 * playerMaxHp)) : undefined}
                  max={playerMaxHp ?? undefined}
                />
                {/* EXP bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                  <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.blue, minWidth: 14 }}>XP</span>
                  <div style={{ flex: 1, height: 3, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${expBarPct}%`, height: '100%', background: D.blue, transition: 'width .5s' }} />
                  </div>
                  <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted, minWidth: 44, textAlign: 'right' }}>
                    {expToNext > 0 ? `-${expToNext}` : 'MAX'}
                  </span>
                </div>
                {playerStats && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {([
                      { label: 'Atk', val: playerStats.attack,                              col: D.white },
                      { label: 'Def', val: Math.round(playerStats.defense * playerDefMult), col: playerDefMult > 1 ? D.green : D.white },
                      { label: 'Spd', val: playerStats.speed,                               col: D.white },
                    ] as const).map(({ label, val, col }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: '3px 8px' }}>
                        <span style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: col }}>{val}</span>
                        <span style={{ fontFamily: FONT_UI, fontSize: 10, color: D.muted, fontWeight: 700 }}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Party position indicator */}
          {hasParty && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, padding: '0 0 8px' }}>
              {party.map((p, i) => (
                <div key={p.instanceId} style={{ width: 6, height: 6, borderRadius: '50%', background: i === activeIdx ? D.yellow : '#3a4a2a' }} />
              ))}
            </div>
          )}

          {/* Damage received — floats over the player avatar */}
          {floats.filter((f) => f.target === 'player').map((f) => (
            <div key={f.id} style={{ position: 'absolute', top: 10, right: 44, fontFamily: FONT_PIXEL, fontSize: 14, fontWeight: 700, pointerEvents: 'none', color: D.red, animation: 'floatDmg 1.8s ease-out forwards', textShadow: '0 2px 6px #000', zIndex: 10, textAlign: 'right' }}>
              -{f.amount}
            </div>
          ))}
          {/* Attribution banner — makes clear the wild Pokémon dealt this damage */}
          {enemyTurnMsg && (
            <div className="fade-up" style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', fontFamily: FONT_PIXEL, fontSize: 8, color: D.white, background: 'rgba(40,0,0,.8)', border: `1px solid ${D.red}`, borderRadius: 6, padding: '4px 8px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 11 }}>
              {enemyTurnMsg}
            </div>
          )}
          </div>{/* end header */}

          {/* Move list — part of this Pokémon's panel */}
          {panel === 'moves' && (
            <div className="fade-up" style={{ padding: '0 12px 12px' }}>
              <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.muted, marginBottom: 8 }}>Choose a move</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {activeMoves.map((slot) => {
                  const currentPp = slot.currentPp;
                  const outOfPp   = currentPp === 0;
                  const tc        = typeColors(slot.type);
                  // The enemy type this move is ×2 against (if any) — shown so the
                  // player sees WHY it's super effective. Simplified chart has only ×2.
                  const seType    = slot.power > 0
                    ? activeEnemyTypes.find((t) => getTypeMultiplier(slot.type, t) === 2)
                    : undefined;
                  return (
                    <button key={slot.moveId} onClick={() => handlePickMove(slot)} disabled={outOfPp} style={{ background: tc.bg, border: `2px solid ${tc.bdr}`, borderRadius: 12, padding: '10px 12px', cursor: outOfPp ? 'not-allowed' : 'pointer', textAlign: 'left', fontFamily: FONT_UI, transition: 'all .15s', opacity: outOfPp ? 0.35 : 1, position: 'relative' }}
                      onMouseEnter={(e) => { if (!outOfPp) { e.currentTarget.style.opacity = '.8'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = outOfPp ? '0.35' : '1'; e.currentTarget.style.transform = 'none'; }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: tc.fg }}>{slot.name}</span>
                        {seType && (
                          <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, fontWeight: 800, color: '#7bd49a', background: 'rgba(72,199,116,.14)', border: '1px solid #2f7d4f', borderRadius: 4, padding: '2px 5px', lineHeight: 1, whiteSpace: 'nowrap' }}>
                            ×2 vs {seType.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <TypeBadge type={slot.type} />
                        <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted }}>PP {currentPp}/{slot.maxPp}</span>
                      </div>
                      <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>{slot.power > 0 ? `PWR ${slot.power}` : 'STATUS'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>{/* end my-Pokémon panel */}

        {/* ── Ball / Potion / Flee ── */}
        {panel === 'moves' && (
          <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            {([
              { label: 'BALL',                img: getBallSpriteUrl('pokeball'),   icon: '🔴', col: typeColors('Water').fg, bg: typeColors('Water').bg, bdr: typeColors('Water').bdr, action: () => setPanel('ball')   },
              { label: `POTION ×${totalPotions}`, img: getItemSpriteUrl('potion'), icon: '🧪', col: D.green,                bg: '#0a1a0a',               bdr: '#1a4020',              action: () => setPanel('potion') },
              { label: 'FLEE',                img: undefined,                      icon: '🏃', col: D.muted,                bg: D.card2,                 bdr: D.border,               action: handleFlee               },
            ] as const).map((btn, i) => (
              <button key={i} onClick={btn.action} style={{ background: btn.bg, border: `2px solid ${btn.bdr}`, borderRadius: 12, padding: '10px 6px', cursor: 'pointer', fontFamily: FONT_UI, fontSize: 12, fontWeight: 900, color: btn.col, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'opacity .15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
                {btn.img
                  ? <img src={btn.img} alt={btn.label} style={{ width: 24, height: 24, imageRendering: 'pixelated', objectFit: 'contain' }} />
                  : <span style={{ fontSize: 20 }}>{btn.icon}</span>}
                {btn.label}
              </button>
            ))}
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
            <BackBtn onClick={() => setPanel('moves')} />
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
              <div style={{ background: D.card, border: `1px solid ${zoneCol}`, borderRadius: 10, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: zoneCol, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: zoneCol }}>{zoneLabel}</span>
              </div>
              {/* Pokédex / already-caught indicator */}
              <div style={{ background: D.card, border: `1px solid ${alreadyCaught ? D.muted : D.green}`, borderRadius: 10, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{alreadyCaught ? '✅' : '✨'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: alreadyCaught ? D.muted : D.green }}>
                  {alreadyCaught ? `You've already caught ${enemyName}` : `New! You haven't caught ${enemyName} yet`}
                </span>
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
              <BackBtn onClick={() => setPanel('moves')} />
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
