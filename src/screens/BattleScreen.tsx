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
import { calcHp, calcAllStats, calcDamage, catchProbability, hpZone, expGained, levelFromExp, expToLevel, moneyReward } from '../lib/formulas';
import { getIdleSpriteUrl, getBallSpriteUrl, getItemSpriteUrl } from '../lib/sprites';
import { generateRankedPuzzle, effectiveMultiplier, getTypeMultiplier } from '../lib/mathProblemGenerator';
import { useBattleStore }  from '../store/battleStore';
import { useGameStore, useActiveTrainer, getPartyPokemon }    from '../store/gameStore';
import type { MathTopic } from '../types/math';
import b from './Battle.module.css';

// Painted forest-clearing backdrop for the whole battle screen.
const BATTLE_URL = `${import.meta.env.BASE_URL}battle.png`;
// Impact "poof" shown over a Pokémon while it's taking damage.
const HIT_URL = `${import.meta.env.BASE_URL}misc/hit.png`;

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

/** Minimal stat shape the enemy-damage helper needs. */
interface AtkDefStats { attack: number; defense: number; spAtk: number; spDef: number }

/**
 * Damage one of the enemy's moves would deal to the active player Pokémon
 * (Accuracy = 1, no crit). Status moves (power 0) use a small fixed chip, just
 * like the player's. Shared by the enemy's attack and the opponent-card range
 * indicator so the shown range matches the hits that land.
 */
function enemyMoveDamage(
  moveId: string,
  enemyS: AtkDefStats,
  playerS: AtkDefStats,
  enemyTypes: readonly PokeType[],
  playerTypes: readonly PokeType[],
  level: number,
  enemyAtkMult: number,
  playerDefMult: number,
): number {
  const mv      = getMove(moveId);
  const power   = mv ? (mv.power > 0 ? mv.power : 20) : 40;
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
      background: D.card, color: D.white, border: `2px solid ${D.border}`,
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

  // Math Rank drives puzzle difficulty but is hidden from the player — it just happens.
  const mathRank = trainer.mathRank ?? 1;

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
      // 0 HP → exactly 0% (fainted); otherwise show at least 1% so a barely-alive
      // Pokémon never reads as fainted.
      return playerPokemon.currentHp <= 0 ? 0 : Math.min(100, Math.max(1, Math.round((playerPokemon.currentHp / maxHp) * 100)));
    }
    return 82;
  })();
  // Focus is a persisted trainer property — start the battle from the saved value.
  const initFocusPips = battle ? (trainer.focus ?? 0) : 2;

  // Display info
  const playerName      = playerSpecies?.name.toUpperCase() ?? 'PIKACHU';
  const playerDexNumber = playerSpecies?.dexNumber ?? 25;
  const enemyName       = enemySpecies?.name.toUpperCase() ?? 'GYARADOS';
  const enemyDexNumber  = enemySpecies?.dexNumber ?? 130;

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
  // UI mirrors of the status-move stat modifiers so the Atk/Def chips visibly
  // change. The refs (below) drive the damage math; these drive the display.
  const [, setEnemyAtkMult]  = useState(1);
  const [enemyDefMult, setEnemyDefMult]  = useState(1);
  const [, setPlayerDefMult] = useState(1);
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
      hpStashRef.current[id] = (pk.currentHp <= 0 || maxHp <= 0) ? 0 : Math.min(100, Math.max(1, Math.round(pk.currentHp / maxHp * 100)));
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

    const enemyRarityForReward = getSpecies(currentBattle.enemy.speciesId)?.rarity ?? 'Common';
    const pokeReward = moneyReward(enemyLevel, enemyRarityForReward);
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
  }, [enemyStats, playerStats, playerMaxHp, enemyLevel, enemyName, enemySpecies, activePlayerTypes]);

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
    if (!battle || enteredGoesFirstRef.current) return;
    const t = setTimeout(() => {
      if (openingStrikeRef.current) return;   // fire exactly once (StrictMode-safe)
      openingStrikeRef.current = true;
      // The strike hits the Pokémon the player entered with (switching is locked
      // until now, so the active Pokémon is still the entered one).
      if (enemyAttack()) {
        const next = firstAlive(activeIdRef.current);
        if (next) switchTo(next); else handleBlackout();
      }
      setCanSwitch(true);   // unlock the carousel now the opening strike has landed
    }, 650);
    return () => clearTimeout(t);
  }, [battle, enemyAttack, handleBlackout, firstAlive, switchTo]);

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
      recordMathAttempt(puzzleRef.current?.topic ?? ('addition' as MathTopic), correct, puzzleRef.current?.isReview ?? false);

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
    if (playerFainted) return;   // a fainted Pokémon can't attack

    // Persist the PP decrement to this Pokémon's stored move list (per move, per Pokémon)
    if (battle && playerPokemon) {
      const newMoves = playerPokemon.moves.map((m) =>
        m.moveId === slot.moveId ? { ...m, currentPp: Math.max(0, m.currentPp - 1) } : m,
      );
      updatePokemon(playerPokemon.instanceId, { moves: newMoves });
    }

    const puzzle       = generateRankedPuzzle(mathRank);
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
    // Catch challenges always use the current rank — never a lower-rank review.
    const puzzle = generateRankedPuzzle(mathRank, false);
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
  const totalBalls   = (trainer.pokeballs.pokeball ?? 0) + (trainer.pokeballs.greatBall ?? 0) + (trainer.pokeballs.ultraBall ?? 0);
  const hpCol = (pct: number) => (pct > 50 ? '#48c774' : pct > 20 ? '#F8D030' : '#CC0000');

  // Player EXP bar (progress within the current level + amount to next).
  const expBarPct = playerPokemon ? (() => {
    const lvl = levelFromExp(playerPokemon.totalExp);
    const range = expToLevel(lvl + 1) - expToLevel(lvl);
    const progress = playerPokemon.totalExp - expToLevel(lvl);
    return range > 0 ? Math.max(0, Math.min(100, Math.round((progress / range) * 100))) : 0;
  })() : 62;
  const expToNext = playerPokemon
    ? Math.max(0, expToLevel(levelFromExp(playerPokemon.totalExp) + 1) - playerPokemon.totalExp)
    : 0;

  // Moves with pre-computed full-power damage vs the current enemy + type info,
  // sorted by damage (highest first). Status moves use the 20-power chip.
  const sortedMoves = activeMoves.map((slot) => {
    const isStatus = slot.power === 0;
    const dmg = (playerStats && enemyStats)
      ? calcDamage({
          movePower:          slot.power > 0 ? slot.power : 20,
          itemBonus:          0,
          attackerAtk:        slot.category === 'special' ? playerStats.spAtk : playerStats.attack,
          defenderDef:        Math.max(1, (slot.category === 'special' ? enemyStats.spDef : enemyStats.defense) * enemyDefMult),
          attackerLevel:      playerLevel,
          typeMultiplier:     effectiveMultiplier(slot.type, activeEnemyTypes),
          stabMultiplier:     activePlayerTypes.some((t) => t === slot.type) ? 1.5 : 1,
          critMultiplier:     focusPips >= 5 ? 2 : 1,
          accuracyMultiplier: 1,
        })
      : null;
    const mult   = effectiveMultiplier(slot.type, activeEnemyTypes);
    const seType = !isStatus ? activeEnemyTypes.find((t) => getTypeMultiplier(slot.type, t) === 2) : undefined;
    const eff: 'super' | 'resist' | 'neutral' | 'status' =
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

  // Whether this wild species is already registered in the player's collection —
  // shown in the ball-throwing view so the player knows if it's a new catch.
  const alreadyCaught = !!battle && trainer.caughtPokemon.some((p) => p.speciesId === battle.enemy.speciesId);

  // ── Party carousel ───────────────────────────────────────────────────────────
  const activeId      = battle?.activePlayerInstanceId ?? '';
  const activeIdx     = party.findIndex((p) => p.instanceId === activeId);
  const hasParty      = party.length > 1 && activeIdx >= 0;

  // Battle HP% of a party member (the active one's is live; others come from the
  // stash). Used to skip fainted members in the carousel and to block attacks.
  // While a damage number is floating over a combatant, show the impact poof
  // in place of its sprite; the Pokémon returns when the float clears.
  const playerHit = floats.some((f) => f.target === 'player');
  const enemyHit  = floats.some((f) => f.target === 'enemy');

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
    <div className={b.screen}>
      <img className={b.bg} src={BATTLE_URL} alt="" />
      <div className={b.content}>

        {/* ── Header: Flee + money ── */}
        <div className={b.header}>
          <button className={b.fleeBtn} onClick={handleFlee}>← Flee</button>
          <span className={b.moneyChip}>₽{trainer.pokeDollars.toLocaleString()}</span>
        </div>

        {/* ── Battle stage ── */}
        <div className={b.arena}>

          {/* My Pokémon — panel top-left, standing on the ground */}
          <div className={b.nameBadge} style={{ top: 10, left: '28%', transform: 'translateX(-50%)' }}>
            <div className={b.nameRow}>
              <span className={b.nameText}>{playerSpecies?.name ?? 'Pikachu'}</span>
              <span className={b.nameLv}>Lv{playerLevel}</span>
              {(() => { const tc = typeColors(activePlayerTypes[0]); return <span className={b.typeBadge} style={{ background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}` }}>{activePlayerTypes[0]}</span>; })()}
            </div>
            <div className={b.hpRow}>
              <span className={b.hpLabel}>HP</span>
              <div className={b.hpTrack}><div className={b.hpFill} style={{ width: `${playerHpPct}%`, background: hpCol(playerHpPct) }} /></div>
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
            : <img key={activeId} className={b.sprite} src={getIdleSpriteUrl(playerDexNumber)} alt="" style={{ left: '28%', top: 146, width: 96, height: 96, transform: 'translateX(-50%)' }} />}
          {hasParty && (
            <>
              <button className={b.arrowBtn} style={{ left: 'calc(28% - 72px)', top: 176 }} disabled={!switchEnabled} onClick={() => switchDir(-1)} aria-label="Previous Pokémon">‹</button>
              <button className={b.arrowBtn} style={{ left: 'calc(28% + 40px)', top: 176 }} disabled={!switchEnabled} onClick={() => switchDir(1)} aria-label="Next Pokémon">›</button>
            </>
          )}
          {floats.filter((f) => f.target === 'player').map((f) => (
            <div key={f.id} className={b.float} style={{ left: '28%', top: 126, transform: 'translateX(-50%)', fontSize: 15, color: '#e0574f' }}>-{f.amount}</div>
          ))}

          {/* Opponent — panel top-right, standing on the ground */}
          <div className={b.nameBadge} style={{ top: 10, left: '72%', transform: 'translateX(-50%)' }}>
            <div className={b.nameRow}>
              <span className={b.nameText}>{enemySpecies?.name ?? 'Gyarados'}</span>
              <span className={b.nameLv}>Lv{enemyLevel}</span>
              {(() => { const tc = typeColors(activeEnemyTypes[0]); return <span className={b.typeBadge} style={{ background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}` }}>{activeEnemyTypes[0]}</span>; })()}
            </div>
            <div className={b.hpRow}>
              <span className={b.hpLabel}>HP</span>
              <div className={b.hpTrack}><div className={b.hpFill} style={{ width: `${enemyHpPct}%`, background: hpCol(enemyHpPct) }} /></div>
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
            : <img className={b.sprite} src={getIdleSpriteUrl(enemyDexNumber)} alt="" style={{ left: '72%', top: 146, width: 92, height: 92, transform: 'translateX(-50%)' }} />}
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
            <div className={`${b.movePanel} fade-up`}>
              <div className={b.moveTitle} style={{ color: playerFainted ? '#e0574f' : '#aeb8d6' }}>
                {playerFainted ? `${playerSpecies?.name ?? 'Your Pokémon'} fainted — switch with ‹ ›` : 'Choose a move'}
              </div>
              {sortedMoves.map(({ slot, isStatus, dmg, seType, eff }) => {
                const outOfPp   = slot.currentPp === 0 || playerFainted;
                const tc        = typeColors(slot.type);
                const rowBg     = eff === 'super' ? '#15301c' : eff === 'resist' ? '#2a1416' : '#222a40';
                const rowBorder = eff === 'super' ? '#5fc46a' : eff === 'resist' ? '#b9564e' : 'transparent';
                const stripe    = eff === 'super' ? '#5fc46a' : eff === 'resist' ? '#b9564e' : tc.fg;
                const dmgCol    = eff === 'super' ? '#6fe07a' : eff === 'resist' ? '#e0857a' : (focusPips >= 5 ? '#ff7b00' : '#ff9a3c');
                return (
                  <button key={slot.moveId} className={b.moveRow} disabled={outOfPp} onClick={() => handlePickMove(slot)} style={{ background: rowBg, borderColor: rowBorder }}>
                    <span className={b.moveStripe} style={{ background: stripe }} />
                    <span className={b.moveName} style={{ color: outOfPp ? '#8892b8' : '#f0f4ff' }}>{slot.name}</span>
                    <span className={b.moveTypePill} style={{ background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}` }}>{slot.type}</span>
                    {seType && <span className={b.superBadge}>×2 vs {seType.toUpperCase()}</span>}
                    {isStatus && <span className={b.statusTag}>STATUS</span>}
                    <span className={b.moveDmg}>
                      {outOfPp
                        ? <span className={b.moveDmgNum} style={{ fontSize: 10, color: '#8892b8' }}>NO PP</span>
                        : <>
                            <span className={b.moveDmgNum} style={{ color: isStatus ? '#aeb8d6' : dmgCol }}>{dmg ?? '–'}</span>
                            <span className={b.moveDmgLabel} style={{ color: isStatus ? '#aeb8d6' : dmgCol }}>DMG</span>
                          </>}
                    </span>
                  </button>
                );
              })}
              <div className={b.actionRow}>
                <button className={b.actionBtn} style={{ borderColor: '#2f6e3a', background: '#0a1a0a', color: '#7fcf86' }} onClick={() => setPanel('potion')}>
                  <img src={getItemSpriteUrl('potion')} alt="" style={{ width: 18, height: 18, imageRendering: 'pixelated', objectFit: 'contain' }} />Potion ×{totalPotions}
                </button>
                <button className={b.actionBtn} style={{ borderColor: '#6a4a8a', background: '#1a1320', color: '#c79af0' }} onClick={() => setPanel('ball')}>
                  <img src={getBallSpriteUrl('pokeball')} alt="" style={{ width: 18, height: 18, imageRendering: 'pixelated', objectFit: 'contain' }} />Ball ×{totalBalls}
                </button>
              </div>
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
                <div style={{ fontFamily: FONT_PIXEL, fontSize: 19, color: D.yellow, lineHeight: 1.8 }}>
                  {currentPuzzle.isReview && <span title="Review challenge — keeps earlier skills sharp">⭐ </span>}
                  {currentPuzzle.equation}
                </div>
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
              <button key={p.key} onClick={() => p.count > 0 && handleUsePotion(p.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: D.card, border: `2px solid ${p.count > 0 ? D.green : D.border}`, borderRadius: 14, padding: '12px 14px', cursor: p.count > 0 ? 'pointer' : 'not-allowed', marginBottom: 8, fontFamily: FONT_UI, color: D.white, opacity: p.count > 0 ? 1 : 0.65, transition: 'all .15s' }}>
                <img src={getItemSpriteUrl(p.key)} alt={p.name} style={{ width: 38, height: 38, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: D.white }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: D.green, fontWeight: 700 }}>Restores +{p.heal} HP</div>
                </div>
                <div style={{ fontFamily: FONT_PIXEL, fontSize: 11, color: D.white }}>×{p.count}</div>
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
                const enemyCatchRate = enemySpecies?.catchRate ?? 128;
                const baseProb = catchProbability(enemyCatchRate, ball.baseRate, enemyHpPct);
                const pCorrect = Math.round(baseProb * 100);
                const pWrong   = Math.round(baseProb * 0.75 * 100);
                return (
                  <button key={ball.name} onClick={() => count > 0 && handleSelectBall(ball)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: D.card, border: `2px solid ${count > 0 ? D.border : D.border}`, borderRadius: 14, padding: '12px 14px', cursor: count > 0 ? 'pointer' : 'not-allowed', marginBottom: 8, fontFamily: FONT_UI, color: D.white, opacity: count > 0 ? 1 : 0.65, transition: 'border-color .15s' }}
                    onMouseEnter={(e) => { if (count > 0) e.currentTarget.style.borderColor = tc.fg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = D.border; }}>
                    <img src={getBallSpriteUrl(ball.consumableKey)} alt={ball.name} style={{ width: 38, height: 38, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: D.white }}>{ball.name}</div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>
                        <span style={{ color: D.green }}>{pCorrect}% if solved</span>
                        <span style={{ color: D.muted }}> · {pWrong}% if not</span>
                      </div>
                    </div>
                    <div style={{ fontFamily: FONT_PIXEL, fontSize: 11, color: D.white }}>×{count}</div>
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
                  <div style={{ fontFamily: FONT_PIXEL, fontSize: 19, color: D.yellow, lineHeight: 1.8 }}>
                    {catchPuzzle.isReview && <span title="Review challenge">⭐ </span>}
                    {catchPuzzle.equation}
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
    </div>
  );
}
