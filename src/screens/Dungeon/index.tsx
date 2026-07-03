/**
 * Dungeon screen — a child-friendly "battle stage" matchup picker.
 *
 * A painted forest backdrop (public/forest.jpg) with two circular platforms:
 * the player's Pokémon stands on the near platform, the chosen wild Pokémon on
 * the far one, with a VS badge between. The player swipes / taps arrows to pick
 * which party member fights (left) and which of the 3 wild Pokémon to face
 * (right). A matchup card below translates the numbers into kid-readable cues:
 * a type verdict, a power tug-of-war bar, and six stat chips. The player's
 * current HP is shown on its badge so they can decide whether to heal first.
 *
 * Defeating or catching the chosen opponent replaces only that slot with a fresh
 * roll; the other two remain. Fleeing leaves the slot untouched.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useShallow }               from 'zustand/react/shallow';

import { useGameStore, useActiveTrainer, getPartyPokemon, isItemSystemActive, getPartyHighestLevel, getLeadInstanceId } from '../../store/gameStore';
import { useDungeonStore } from '../../store/dungeonStore';
import { useBattleStore }  from '../../store/battleStore';
import RarityBadge from '../../components/RarityBadge';
import TypeBadge from '../../components/ui/TypeBadge';
import { typeColors } from '../../styles/tokens';
import { getSpecies }      from '../../data/species';
import { getMove }         from '../../data/moves';
import { calcHp, calcAllStats, expToLevel, levelFromExp, totalPotions, totalBalls } from '../../lib/formulas';
import { damageRange, wildMoveIds, type Fighter } from '../../lib/matchup';
import { effectiveMultiplier } from '../../lib/mathProblemGenerator';
import { getIdleSpriteUrl, getItemSpriteUrl, getBallSpriteUrl } from '../../lib/sprites';

import type { EncounterData } from '../../types/dungeon';
import type { OwnedPokemon } from '../../types/gameState';
import type { PokeType } from '../../types/pokemon';

import { asset } from '../../lib/assets';
import s from './Dungeon.module.css';

const FOREST_URL  = asset('forest.jpg');
const TRAINER_IMG = asset('trainer.png');

// ── Build an OwnedPokemon from encounter data for battleStore.startBattle() ───

function buildEnemyPokemon(encounter: EncounterData): OwnedPokemon {
  const species = getSpecies(encounter.speciesId);
  const hp = species ? calcHp(species.baseStats.hp, encounter.level) : encounter.level * 5 + 10;
  const moves = species
    ? species.learnset.filter((lm) => lm.level <= encounter.level).slice(-4).map((lm) => {
        const mv = getMove(lm.moveId);
        return { moveId: lm.moveId, currentPp: mv?.pp ?? 20 };
      })
    : [];
  return { instanceId: `enemy-${Date.now()}`, speciesId: encounter.speciesId, totalExp: expToLevel(encounter.level), currentHp: hp, moves };
}

// ── Touch swipe ────────────────────────────────────────────────────────────────

interface ArenaSwipe { x: number; side: 'me' | 'wild'; }

// ── Stat comparison chip ────────────────────────────────────────────────────────

function StatChip({ label, mine, theirs }: { label: string; mine: number; theirs: number }) {
  const win = mine > theirs, lose = mine < theirs;
  const col = win ? '#5fc46a' : lose ? '#e0574f' : '#8c98b8';
  const arrow = win ? '▲' : lose ? '▼' : '–';
  return (
    <div className={s.chip}>
      <div className={s.chipLabel}>{label}</div>
      <div className={s.chipRow}>
        <span className={s.chipMine}>{mine}</span>
        <span className={s.chipFoe} style={{ color: col }}>{arrow}{theirs}</span>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DungeonScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  const trainer = useActiveTrainer();
  const setLead = useGameStore((gs) => gs.setLead);
  const recordOpponentLevel = useGameStore((gs) => gs.recordOpponentLevel);

  const { encounters, rollAll, selectEncounter, replaceActive } = useDungeonStore(
    useShallow((ds) => ({ encounters: ds.encounters, rollAll: ds.rollAll, selectEncounter: ds.selectEncounter, replaceActive: ds.replaceActive })),
  );

  const startBattle = useBattleStore((st) => st.startBattle);

  const party       = getPartyPokemon(trainer);
  const itemActive  = isItemSystemActive(trainer);
  const leadId      = getLeadInstanceId(trainer);

  const initialPartyIdx = Math.max(0, party.findIndex((p) => p.instanceId === leadId));
  const [partyIdx, setPartyIdx] = useState(initialPartyIdx);
  const [wildIdx,  setWildIdx]  = useState(0);
  // Stat-chip comparison is folded away by default (kid-first: verdict + power bar).
  const [showStats, setShowStats] = useState(false);

  useEffect(() => { if (party.length && partyIdx >= party.length) setPartyIdx(party.length - 1); }, [party.length, partyIdx]);
  useEffect(() => { if (encounters.length && wildIdx >= encounters.length) setWildIdx(encounters.length - 1); }, [encounters.length, wildIdx]);

  useEffect(() => { encounters.forEach((e) => recordOpponentLevel(e.level)); }, [encounters, recordOpponentLevel]);

  const outcomeHandledRef = useRef(false);

  // React to the battle outcome carried over from the Battle → Summary flow:
  // a win or catch retires the defeated encounter, a flee just deselects it.
  useEffect(() => {
    if (outcomeHandledRef.current) return;
    outcomeHandledRef.current = true;
    const state   = (location.state as Record<string, unknown> | null);
    const outcome = state?.battleOutcome;
    const lvl     = getPartyHighestLevel(trainer);
    if (outcome === 'victory' || outcome === 'caught') {
      replaceActive(lvl, itemActive);
    } else if (outcome === 'fled') {
      selectEncounter(null);
    }
    if (useDungeonStore.getState().encounters.length === 0) rollAll(lvl, itemActive);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const potionCount = totalPotions(trainer.potions);
  const ballCount   = totalBalls(trainer.pokeballs);

  const safePartyIdx = Math.min(partyIdx, Math.max(0, party.length - 1));
  const safeWildIdx  = Math.min(wildIdx,  Math.max(0, encounters.length - 1));

  const playerPk  = party[safePartyIdx] ?? null;
  const enc       = encounters[safeWildIdx] ?? null;

  const matchup = useMemo(() => {
    if (!playerPk || !enc) return null;
    const pSpec = getSpecies(playerPk.speciesId);
    const wSpec = getSpecies(enc.speciesId);
    if (!pSpec || !wSpec) return null;

    const pLevel = levelFromExp(playerPk.totalExp);
    const pStats = calcAllStats(pSpec.baseStats, pLevel);
    const wStats = calcAllStats(wSpec.baseStats, enc.level);

    const xpLo = expToLevel(pLevel);
    const xpHi = expToLevel(pLevel + 1);
    const xpPct = xpHi > xpLo ? Math.max(0, Math.min(100, Math.round(((playerPk.totalExp - xpLo) / (xpHi - xpLo)) * 100))) : 0;
    const xpToNext = Math.max(0, xpHi - playerPk.totalExp);

    const pFighter: Fighter = { speciesId: playerPk.speciesId, level: pLevel, moveIds: playerPk.moves.map((m) => m.moveId) };
    const wFighter: Fighter = { speciesId: enc.speciesId,      level: enc.level, moveIds: wildMoveIds(enc.speciesId, enc.level) };

    const pDmg = damageRange(pFighter, wFighter);
    const wDmg = damageRange(wFighter, pFighter);

    // Type verdict — best damaging-move multiplier each way.
    const edges = (moveIds: string[], defTypes: readonly PokeType[]) => {
      const vals = moveIds
        .map(getMove)
        .filter((m): m is NonNullable<ReturnType<typeof getMove>> => !!m && m.power > 0)
        .map((m) => effectiveMultiplier(m.type, defTypes));
      return vals.length ? Math.max(...vals) : 1;
    };
    const yourEdge  = edges(pFighter.moveIds, wSpec.types);
    const theirEdge = edges(wFighter.moveIds, pSpec.types);
    const verdict: 'super' | 'careful' | 'even' = yourEdge > theirEdge ? 'super' : yourEdge < theirEdge ? 'careful' : 'even';

    // Power tug-of-war — share of "KO speed" (HP removed per turn).
    const pAvg = (pDmg.min + pDmg.max) / 2;
    const wAvg = (wDmg.min + wDmg.max) / 2;
    const yourScore  = pAvg / Math.max(1, wStats.maxHp);
    const theirScore = wAvg / Math.max(1, pStats.maxHp);
    const yourShare  = (yourScore + theirScore) > 0 ? yourScore / (yourScore + theirScore) : 0.5;

    return {
      verdict,
      yourShare,
      player: {
        speciesId: pSpec.id, name: pSpec.name, dexNumber: pSpec.dexNumber, type: pSpec.types[0] as string, rarity: pSpec.rarity, level: pLevel,
        curHp: Math.max(0, Math.min(pStats.maxHp, playerPk.currentHp)), maxHp: pStats.maxHp, xpPct, xpToNext,
        attack: pStats.attack, spAtk: pStats.spAtk, defense: pStats.defense, spDef: pStats.spDef, speed: pStats.speed,
      },
      wild: {
        speciesId: wSpec.id, name: wSpec.name, dexNumber: wSpec.dexNumber, type: wSpec.types[0] as string, rarity: wSpec.rarity, level: enc.level,
        maxHp: wStats.maxHp,
        attack: wStats.attack, spAtk: wStats.spAtk, defense: wStats.defense, spDef: wStats.spDef, speed: wStats.speed,
      },
    };
  }, [playerPk, enc]);

  const prevParty = useCallback(() => setPartyIdx((i) => (i - 1 + party.length) % party.length), [party.length]);
  const nextParty = useCallback(() => setPartyIdx((i) => (i + 1) % party.length), [party.length]);
  const prevWild  = useCallback(() => setWildIdx((i) => (i - 1 + encounters.length) % encounters.length), [encounters.length]);
  const nextWild  = useCallback(() => setWildIdx((i) => (i + 1) % encounters.length), [encounters.length]);
  // Side-aware swipe: a swipe that starts on the left cycles my party, on the
  // right cycles the wild — so swiping over "my" Pokémon no longer moves the foe.
  const swipeRef = useRef<ArenaSwipe | null>(null);
  const onArenaTouchStart = useCallback((e: React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX;
    swipeRef.current = { x, side: (x - rect.left) < rect.width / 2 ? 'me' : 'wild' };
  }, []);
  const onArenaTouchEnd = useCallback((e: React.TouchEvent) => {
    const st = swipeRef.current;
    swipeRef.current = null;
    if (!st) return;
    const dx = e.changedTouches[0].clientX - st.x;
    if (Math.abs(dx) < 40) return;
    if (st.side === 'me') (dx > 0 ? prevParty : nextParty)();
    else (dx > 0 ? prevWild : nextWild)();
  }, [prevParty, nextParty, prevWild, nextWild]);

  const handleFight = useCallback(() => {
    if (!playerPk || !enc) return;
    setLead(playerPk.instanceId);
    useDungeonStore.getState().selectEncounter(safeWildIdx);
    startBattle(buildEnemyPokemon(enc), playerPk.instanceId);
    navigate('/battle');
  }, [playerPk, enc, safeWildIdx, setLead, startBattle, navigate]);

  const handleReturnToTown = useCallback(() => navigate('/'), [navigate]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const hpPct  = matchup ? Math.round((matchup.player.curHp / Math.max(1, matchup.player.maxHp)) * 100) : 100;
  const hpCol  = hpPct > 50 ? '#5fc46a' : hpPct > 25 ? '#f0a030' : '#e0574f';
  const VERDICT = {
    super:   { text: '👍 Great pick — your moves hit super hard!', bg: '#d7f0cf', fg: '#1f5a23' },
    careful: { text: '⚠️ Careful — it hits your type hard!',       bg: '#f6d3cd', fg: '#8a2d1d' },
    even:    { text: '⚖️ Fair fight!',                             bg: '#dfe3ef', fg: '#3a4055' },
  } as const;
  const powerPct  = matchup ? Math.round(matchup.yourShare * 100) : 50;
  // Disk colours follow each Pokémon's type; the darker tone forms the front edge.
  const pC = matchup ? typeColors(matchup.player.type) : null;
  const wC = matchup ? typeColors(matchup.wild.type) : null;
  const diskStyle = (c: ReturnType<typeof typeColors>): React.CSSProperties => ({
    background: c.fg,
    border: `1px solid ${c.bg}`,
    boxShadow: `0 7px 0 ${c.bdr}, 0 15px 11px rgba(0,0,0,0.3)`,
  });

  return (
    <div className={s.screen}>
      <img className={s.bg} src={FOREST_URL} alt="" aria-hidden />

      <div className={s.content}>
        {/* Header: back + potions + balls */}
        <div className={s.header}>
          <button className={s.backBtn} onClick={handleReturnToTown}>← Town</button>
          <div className={s.invChips}>
            <span className={s.invChip} style={{ color: potionCount > 0 ? '#eef2ff' : '#e0574f' }}>
              <img src={getItemSpriteUrl('potion')} alt="" style={{ width: 16, height: 16, imageRendering: 'pixelated', objectFit: 'contain' }} />×{potionCount}
            </span>
            <span className={s.invChip} style={{ color: ballCount > 0 ? '#eef2ff' : '#e0574f' }}>
              <img src={getBallSpriteUrl('pokeball')} alt="" style={{ width: 16, height: 16, imageRendering: 'pixelated', objectFit: 'contain' }} />×{ballCount}
            </span>
            <span className={s.invChip} style={{ color: '#FFCB05' }}>
              ₽{trainer.pokeDollars.toLocaleString()}
            </span>
          </div>
        </div>

        {!matchup ? (
          <div className={s.loading}>FINDING WILD POKÉMON…</div>
        ) : (
          <>
            {/* ── Battle stage ── */}
            <div className={s.arena} onTouchStart={onArenaTouchStart} onTouchEnd={onArenaTouchEnd}>
              {/* ── Opponent group — scaled down so the wild reads as farther away ── */}
              <div className={s.wildGroup}>
                {/* Wild status panel — ABOVE the wild Pokémon */}
                <div className={s.nameBadge} style={{ top: 8, left: '72%', transform: 'translateX(-50%)' }}>
                  <div className={s.nameRow}>
                    <span className={s.nameText}>{matchup.wild.name}</span>
                    <span className={s.nameLv}>Lv{matchup.wild.level}</span>
                  </div>
                  <div><TypeBadge type={matchup.wild.type} /></div>
                  <div><RarityBadge rarity={matchup.wild.rarity} /></div>
                </div>
                <div className={s.platform} style={{ left: '72%', top: 128, width: 120, height: 30, transform: 'translateX(-50%)', ...(wC ? diskStyle(wC) : {}) }} />
                <div className={s.platformShadow} style={{ left: '72%', top: 138, width: 52, height: 9, transform: 'translateX(-50%)' }} />
                <img className={s.sprite} src={getIdleSpriteUrl(matchup.wild.dexNumber)} alt=""
                     onClick={() => navigate(`/pokemon/${matchup.wild.speciesId}`)}
                     style={{ left: '72%', top: 78, width: 84, height: 84, transform: 'translateX(-50%)', zIndex: 4, cursor: 'pointer', pointerEvents: 'auto' }} />
                <button className={s.arrowBtn} style={{ left: 'calc(72% - 79px)', top: 103, pointerEvents: 'auto' }} onClick={prevWild} aria-label="Previous wild Pokémon">‹</button>
                <button className={s.arrowBtn} style={{ left: 'calc(72% + 45px)', top: 103, pointerEvents: 'auto' }} onClick={nextWild} aria-label="Next wild Pokémon">›</button>
              </div>

              {/* VS */}
              <div className={s.vsBadge} style={{ top: 158 }}>VS</div>

              {/* My disk + shadow + sprite (below my panel) */}
              <div className={s.platform} style={{ left: '28%', top: 222, width: 132, height: 32, transform: 'translateX(-50%)', ...(pC ? diskStyle(pC) : {}) }} />
              <div className={s.platformShadow} style={{ left: '28%', top: 233, width: 62, height: 10, transform: 'translateX(-50%)' }} />
              <img className={s.sprite} src={getIdleSpriteUrl(matchup.player.dexNumber)} alt=""
                   onClick={() => navigate(`/pokemon/${matchup.player.speciesId}`)}
                   style={{ left: '28%', top: 168, width: 92, height: 92, transform: 'translateX(-50%)', cursor: 'pointer' }} />

              {/* Player status panel + HP/XP — ABOVE my Pokémon */}
              <div className={s.nameBadge} style={{ top: 56, left: '28%', transform: 'translateX(-50%)', minWidth: 130 }}>
                <img className={s.trainerDot} src={TRAINER_IMG} alt="" />
                <div className={s.nameRow} style={{ paddingLeft: 22 }}>
                  <span className={s.nameText}>{matchup.player.name}</span>
                  <span className={s.nameLv}>Lv{matchup.player.level}</span>
                </div>
                <div><TypeBadge type={matchup.player.type} /></div>
                <div><RarityBadge rarity={matchup.player.rarity} /></div>
                <div className={s.hpRow}>
                  <span className={s.hpLabel}>HP</span>
                  <div className={s.hpTrack}><div className={s.hpFill} style={{ width: `${hpPct}%`, background: hpCol }} /></div>
                  <span className={s.hpText}>{matchup.player.curHp}/{matchup.player.maxHp}</span>
                </div>
                <div className={s.hpRow}>
                  <span className={s.hpLabel}>XP</span>
                  <div className={s.hpTrack}><div className={s.hpFill} style={{ width: `${matchup.player.xpPct}%`, background: '#6890F0' }} /></div>
                  <span className={s.hpText}>{matchup.player.xpToNext > 0 ? `-${matchup.player.xpToNext}` : 'MAX'}</span>
                </div>
              </div>

              {/* My carousel arrows — flank my sprite */}
              <button className={s.arrowBtn} style={{ left: 'calc(28% - 79px)', top: 198 }} onClick={prevParty} aria-label="Previous party Pokémon">‹</button>
              <button className={s.arrowBtn} style={{ left: 'calc(28% + 45px)', top: 198 }} onClick={nextParty} aria-label="Next party Pokémon">›</button>
            </div>

            <div className={s.swipeHint}>‹ swipe to pick your matchup ›</div>

            {/* ── Matchup card ── */}
            <div className={s.matchCard}>
              {/* Plain-language verdict — always shown, kid-readable. */}
              <div className={s.verdictRow}>
                <span className={s.verdict} style={{ background: VERDICT[matchup.verdict].bg, color: VERDICT[matchup.verdict].fg }}>
                  {VERDICT[matchup.verdict].text}
                </span>
              </div>

              <div className={s.powerHead}>
                <span className={s.powerLabel}>Power</span>
              </div>
              <div className={s.powerTrack}>
                <div className={s.powerYou} style={{ width: `${powerPct}%` }} />
                <div className={s.powerFoe} style={{ width: `${100 - powerPct}%` }} />
              </div>
              <div className={s.powerEnds}>
                <span className={s.powerEnd} style={{ color: '#5fc46a' }}>You</span>
                <span className={s.powerEnd} style={{ color: '#e0574f' }}>Wild</span>
              </div>

              {/* The six stat chips are trainer-brain detail — folded away by default. */}
              <button className={s.detailsBtn} onClick={() => setShowStats((v) => !v)}>
                {showStats ? 'Hide stats ▴' : 'Compare stats ▾'}
              </button>
              {showStats && (
                <div className={s.chipGrid}>
                  <StatChip label="HP"      mine={matchup.player.maxHp}   theirs={matchup.wild.maxHp} />
                  <StatChip label="Attack"  mine={matchup.player.attack}  theirs={matchup.wild.attack} />
                  <StatChip label="Sp.Atk"  mine={matchup.player.spAtk}   theirs={matchup.wild.spAtk} />
                  <StatChip label="Speed"   mine={matchup.player.speed}   theirs={matchup.wild.speed} />
                  <StatChip label="Defense" mine={matchup.player.defense} theirs={matchup.wild.defense} />
                  <StatChip label="Sp.Def"  mine={matchup.player.spDef}   theirs={matchup.wild.spDef} />
                </div>
              )}
            </div>

            <button className={s.fightBtn} onClick={handleFight}>⚔️ Fight!</button>
          </>
        )}
      </div>
    </div>
  );
}
