/**
 * Dungeon screen — a split-screen "VS" matchup picker.
 *
 * There are no floors or rooms. The player is offered THREE wild Pokémon and
 * picks one to fight. The screen shows a single arcade-style VS banner: the
 * player's party on the LEFT (swipe to change lead) and the wild Pokémon on the
 * RIGHT (swipe through the 3 on offer). A live stat + damage-range comparison
 * sits below so the player can hunt for the matchup they want before committing.
 *
 * Defeating or catching the chosen opponent replaces only that slot with a fresh
 * roll; the other two remain. Fleeing leaves the slot untouched. Difficulty
 * (enemy level + math) scales with the player's strongest Pokémon.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useShallow }               from 'zustand/react/shallow';

import { useGameStore, useActiveTrainer, getPartyPokemon, isItemSystemActive, getPartyHighestLevel, getLeadInstanceId } from '../../store/gameStore';
import { useDungeonStore } from '../../store/dungeonStore';
import { useBattleStore }  from '../../store/battleStore';
import RarityBadge from '../../components/RarityBadge';
import { typeColors, FONT_PIXEL } from '../../styles/tokens';
import { getSpecies }      from '../../data/species';
import { getMove }         from '../../data/moves';
import { calcHp, calcAllStats, expToLevel, levelFromExp } from '../../lib/formulas';
import { damageRange, wildMoveIds, type Fighter } from '../../lib/matchup';
import { getIdleSpriteUrl, getItemSpriteUrl } from '../../lib/sprites';

import type { EncounterData } from '../../types/dungeon';
import type { OwnedPokemon } from '../../types/gameState';

import s from './Dungeon.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExpGainEntry {
  instanceId: string;
  name:       string;
  dexNumber:  number;
  expAdded:   number;
  oldLevel:   number;
  newLevel:   number;
}

interface OutcomeBanner {
  kind:       'victory' | 'caught';
  name:       string;
  expGains:   ExpGainEntry[];
  pokeReward?: number;
}

// ── Build an OwnedPokemon from encounter data for battleStore.startBattle() ───

function buildEnemyPokemon(encounter: EncounterData): OwnedPokemon {
  const species = getSpecies(encounter.speciesId);
  const hp = species
    ? calcHp(species.baseStats.hp, encounter.level)
    : encounter.level * 5 + 10;

  const moves = species
    ? species.learnset
        .filter((lm) => lm.level <= encounter.level)
        .slice(-4)
        .map((lm) => {
          const mv = getMove(lm.moveId);
          return { moveId: lm.moveId, currentPp: mv?.pp ?? 20 };
        })
    : [];

  return {
    instanceId: `enemy-${Date.now()}`,
    speciesId:  encounter.speciesId,
    totalExp:   expToLevel(encounter.level),
    currentHp:  hp,
    moves,
  };
}

// ── TypeBadge (local) ─────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const c = typeColors(type);
  return (
    <span className={s.typeBadge} style={{ background: c.bg, color: c.fg, border: `1px solid ${c.bdr}` }}>
      {type}
    </span>
  );
}

// ── Outcome banner (victory / caught) ─────────────────────────────────────────

function OutcomeBanner({ banner, onClose }: { banner: OutcomeBanner; onClose: () => void }) {
  return (
    <div
      className="fade-up"
      onClick={onClose}
      style={{ margin: '0 14px 4px', background: '#0d2a10', border: '2px solid #48c774', borderRadius: 14, padding: '12px 14px', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: banner.expGains.length || banner.pokeReward != null ? 8 : 0 }}>
        <span style={{ fontSize: 18 }}>{banner.kind === 'victory' ? '🎉' : '🎯'}</span>
        <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 800, color: '#eafff0' }}>
          {banner.kind === 'victory' ? `${banner.name} defeated!` : `${banner.name} caught!`}
        </span>
        {banner.pokeReward != null && banner.pokeReward > 0 && (
          <span style={{ marginLeft: 'auto', fontFamily: FONT_PIXEL, fontSize: 9, color: '#F8D030' }}>
            ₽{banner.pokeReward.toLocaleString()}
          </span>
        )}
      </div>
      {banner.expGains.map((g) => (
        <div key={g.instanceId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <img src={getIdleSpriteUrl(g.dexNumber)} alt={g.name} style={{ width: 22, height: 22, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }} />
          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, color: '#f0f4ff', textTransform: 'capitalize' }}>{g.name}</span>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#6890F0' }}>+{g.expAdded} EXP</span>
          {g.newLevel > g.oldLevel && (
            <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: '#F8D030', background: '#1a1400', border: '1px solid #F8D030', borderRadius: 5, padding: '2px 5px' }}>
              LV{g.newLevel}!
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Swipe handling helper (touch) ──────────────────────────────────────────────

function useSwipe(onPrev: () => void, onNext: () => void) {
  const startX = useRef<number | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; },
    onTouchEnd:   (e: React.TouchEvent) => {
      if (startX.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      startX.current = null;
      if (dx > 40) onPrev();
      else if (dx < -40) onNext();
    },
  };
}

// ── Half of the VS banner ──────────────────────────────────────────────────────

interface BannerHalfProps {
  side:      'left' | 'right';
  dexNumber: number;
  type:      string;
  count:     number;
  index:     number;
  onPrev:    () => void;
  onNext:    () => void;
}

function BannerHalf({ side, dexNumber, type, count, index, onPrev, onNext }: BannerHalfProps) {
  const c = typeColors(type);
  const swipe = useSwipe(onPrev, onNext);
  const angle = side === 'left' ? 150 : 210;
  const bg = `linear-gradient(${angle}deg, ${c.fg}dd 0%, ${c.bg} 55%, #06070d 100%)`;

  return (
    <>
      <div
        className={`${s.vsHalf} ${side === 'left' ? s.vsHalfLeft : s.vsHalfRight}`}
        style={{ background: bg }}
        {...swipe}
      >
        <img
          className={`${s.vsSprite} ${side === 'left' ? s.vsSpriteLeft : s.vsSpriteRight}`}
          src={getIdleSpriteUrl(dexNumber)}
          alt=""
        />
      </div>

      <div className={`${s.vsControls} ${side === 'left' ? s.vsControlsLeft : s.vsControlsRight}`}>
        <button className={s.vsArrow} onClick={onPrev} aria-label="Previous">‹</button>
        <div className={s.vsDots}>
          {Array.from({ length: count }, (_, i) => (
            <span key={i} className={`${s.vsDot} ${i === index ? s.vsDotOn : ''}`} />
          ))}
        </div>
        <button className={s.vsArrow} onClick={onNext} aria-label="Next">›</button>
      </div>
    </>
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
    useShallow((ds) => ({
      encounters:      ds.encounters,
      rollAll:         ds.rollAll,
      selectEncounter: ds.selectEncounter,
      replaceActive:   ds.replaceActive,
    })),
  );

  const startBattle = useBattleStore((st) => st.startBattle);

  const party       = getPartyPokemon(trainer);
  const itemActive  = isItemSystemActive(trainer);
  const leadId      = getLeadInstanceId(trainer);

  // ── Carousel selection ───────────────────────────────────────────────────
  const initialPartyIdx = Math.max(0, party.findIndex((p) => p.instanceId === leadId));
  const [partyIdx, setPartyIdx] = useState(initialPartyIdx);
  const [wildIdx,  setWildIdx]  = useState(0);

  // Keep indices in range as data changes (party edits, slot replacement).
  useEffect(() => {
    if (party.length && partyIdx >= party.length) setPartyIdx(party.length - 1);
  }, [party.length, partyIdx]);
  useEffect(() => {
    if (encounters.length && wildIdx >= encounters.length) setWildIdx(encounters.length - 1);
  }, [encounters.length, wildIdx]);

  // Track the highest-level opponent the player has encountered (persisted).
  useEffect(() => {
    encounters.forEach((e) => recordOpponentLevel(e.level));
  }, [encounters, recordOpponentLevel]);

  const [outcomeBanner, setOutcomeBanner] = useState<OutcomeBanner | null>(null);
  const outcomeHandledRef = useRef(false);

  // Read battle outcome passed back from BattleScreen via navigation state.
  useEffect(() => {
    if (outcomeHandledRef.current) return;
    outcomeHandledRef.current = true;
    const state   = (location.state as Record<string, unknown> | null);
    const outcome = state?.battleOutcome;
    const ds      = useDungeonStore.getState();
    const lvl     = getPartyHighestLevel(trainer);

    if (outcome === 'victory' || outcome === 'caught') {
      const defeated = ds.activeIndex !== null ? ds.encounters[ds.activeIndex] : null;
      setOutcomeBanner({
        kind:       outcome === 'victory' ? 'victory' : 'caught',
        name:       defeated?.speciesName ?? 'Pokémon',
        expGains:   (state?.expGains as ExpGainEntry[] | undefined) ?? [],
        pokeReward: state?.pokeReward as number | undefined,
      });
      replaceActive(lvl, itemActive);   // replace only the fought slot
    } else if (outcome === 'fled') {
      selectEncounter(null);            // opponent stays on offer
    }
    if (useDungeonStore.getState().encounters.length === 0) {
      rollAll(lvl, itemActive);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss the outcome banner.
  useEffect(() => {
    if (!outcomeBanner) return;
    const t = setTimeout(() => setOutcomeBanner(null), 4500);
    return () => clearTimeout(t);
  }, [outcomeBanner]);

  const totalPotions = trainer.potions.potion + trainer.potions.superPotion + trainer.potions.hyperPotion;

  // ── Resolve the two fighters currently shown ─────────────────────────────
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

    const pFighter: Fighter = { speciesId: playerPk.speciesId, level: pLevel, moveIds: playerPk.moves.map((m) => m.moveId) };
    const wFighter: Fighter = { speciesId: enc.speciesId,      level: enc.level, moveIds: wildMoveIds(enc.speciesId, enc.level) };

    const pDmg = damageRange(pFighter, wFighter);
    const wDmg = damageRange(wFighter, pFighter);

    return {
      player: {
        name: pSpec.name, dexNumber: pSpec.dexNumber, type: pSpec.types[0] as string,
        types: pSpec.types as string[], rarity: pSpec.rarity, level: pLevel,
        health: Math.max(0, playerPk.currentHp), maxHp: pStats.maxHp,
        attack: pStats.attack, spAtk: pStats.spAtk, defense: pStats.defense, spDef: pStats.spDef,
        minDmg: pDmg.min, maxDmg: pDmg.max,
      },
      wild: {
        name: wSpec.name, dexNumber: wSpec.dexNumber, type: wSpec.types[0] as string,
        types: wSpec.types as string[], rarity: wSpec.rarity, level: enc.level,
        health: wStats.maxHp, maxHp: wStats.maxHp,
        attack: wStats.attack, spAtk: wStats.spAtk, defense: wStats.defense, spDef: wStats.spDef,
        minDmg: wDmg.min, maxDmg: wDmg.max,
      },
    };
  }, [playerPk, enc]);

  // ── Carousel nav ─────────────────────────────────────────────────────────
  const prevParty = useCallback(() => setPartyIdx((i) => (i - 1 + party.length) % party.length), [party.length]);
  const nextParty = useCallback(() => setPartyIdx((i) => (i + 1) % party.length), [party.length]);
  const prevWild  = useCallback(() => setWildIdx((i) => (i - 1 + encounters.length) % encounters.length), [encounters.length]);
  const nextWild  = useCallback(() => setWildIdx((i) => (i + 1) % encounters.length), [encounters.length]);

  // ── Fight ────────────────────────────────────────────────────────────────
  const handleFight = useCallback(() => {
    if (!playerPk || !enc) return;
    setLead(playerPk.instanceId);
    useDungeonStore.getState().selectEncounter(safeWildIdx);
    startBattle(buildEnemyPokemon(enc), playerPk.instanceId);
    navigate('/battle');
  }, [playerPk, enc, safeWildIdx, setLead, startBattle, navigate]);

  const handleReturnToTown = useCallback(() => navigate('/'), [navigate]);

  // Stat comparison rows (higher value wins, highlighted green).
  // `pText`/`wText` override the displayed cell while p/w stay numeric for the
  // win/lose highlight — used by Health to show MAX(CURRENT) for the party side.
  const statRows: { label: string; p: number; w: number; dmg: boolean; pText?: string }[] = matchup
    ? [
        { label: 'Health',  p: matchup.player.health,  w: matchup.wild.health,  dmg: false, pText: `${matchup.player.maxHp}(${matchup.player.health})` },
        { label: 'Attack',  p: matchup.player.attack,  w: matchup.wild.attack,  dmg: false },
        { label: 'Sp. Atk', p: matchup.player.spAtk,   w: matchup.wild.spAtk,   dmg: false },
        { label: 'Defense', p: matchup.player.defense, w: matchup.wild.defense, dmg: false },
        { label: 'Sp. Def', p: matchup.player.spDef,   w: matchup.wild.spDef,   dmg: false },
        { label: 'Min DMG', p: matchup.player.minDmg,  w: matchup.wild.minDmg,  dmg: true  },
        { label: 'Max DMG', p: matchup.player.maxDmg,  w: matchup.wild.maxDmg,  dmg: true  },
      ]
    : [];

  const cls = (mine: number, theirs: number) =>
    mine > theirs ? s.statWin : mine < theirs ? s.statLose : '';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.screen}>

      {/* ══ TOP BAR ═══════════════════════════════════════════════════════ */}
      <div className={s.topBar}>
        <div className={s.topBarMeta}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleReturnToTown}
              style={{ background: '#22253a', border: '2px solid #3a3d5c', borderRadius: 10, padding: '6px 12px', color: '#8892b8', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
            >
              ← Town
            </button>
            <div>
              <div className={s.floorLabel}>DUNGEON</div>
              <div className={s.floorNumber}>Wild Battles</div>
            </div>
          </div>
          <div className={s.topBarRight}>
            <div className={s.econGroup}>
              <div className={s.econLabel}>POTIONS</div>
              <div className={s.econValue} style={{ color: totalPotions > 1 ? '#48c774' : '#CC0000', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                <img src={getItemSpriteUrl('potion')} alt="" style={{ width: 16, height: 16, imageRendering: 'pixelated', objectFit: 'contain' }} />
                ×{totalPotions}
              </div>
            </div>
            <div className={s.econGroup}>
              <div className={s.econLabel}>POKÉDOLLARS</div>
              <div className={s.econValue} style={{ color: '#FFCB05' }}>
                ₽{trainer.pokeDollars.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ OUTCOME BANNER ════════════════════════════════════════════════ */}
      {outcomeBanner && <OutcomeBanner banner={outcomeBanner} onClose={() => setOutcomeBanner(null)} />}

      {/* ══ VS MATCHUP ════════════════════════════════════════════════════ */}
      <div className={s.vsContent}>
        {!matchup ? (
          <div className={s.floorComplete}>
            <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#FFCB05' }}>FINDING WILD POKÉMON…</span>
          </div>
        ) : (
          <>
            {/* Split banner */}
            <div className={s.vsBanner}>
              <BannerHalf
                side="left"
                dexNumber={matchup.player.dexNumber}
                type={matchup.player.type}
                count={party.length}
                index={safePartyIdx}
                onPrev={prevParty}
                onNext={nextParty}
              />
              <BannerHalf
                side="right"
                dexNumber={matchup.wild.dexNumber}
                type={matchup.wild.type}
                count={encounters.length}
                index={safeWildIdx}
                onPrev={prevWild}
                onNext={nextWild}
              />
              <div className={s.vsSeam} />
              <div className={s.vsDiamond}>VS</div>
            </div>

            {/* Names header (below the banner) */}
            <div className={s.vsHeader}>
              <div className={s.vsHeaderCol}>
                <div className={s.vsHeaderLabel}>MY POKÉMON</div>
                <div className={s.vsHeaderName}>
                  {matchup.player.name}
                  <span className={s.vsHeaderLv}>Lv{matchup.player.level}</span>
                </div>
                <div className={s.vsHeaderBadges}>
                  {matchup.player.types.map((t) => <TypeBadge key={t} type={t} />)}
                </div>
              </div>
              <div className={s.vsHeaderCol} style={{ textAlign: 'right' }}>
                <div className={s.vsHeaderLabel}>WILD POKÉMON</div>
                <div className={s.vsHeaderName}>
                  {matchup.wild.name}
                  <span className={s.vsHeaderLv}>Lv{matchup.wild.level}</span>
                </div>
                <div className={s.vsHeaderBadges} style={{ justifyContent: 'flex-end' }}>
                  {matchup.wild.types.map((t) => <TypeBadge key={t} type={t} />)}
                  <RarityBadge rarity={matchup.wild.rarity} />
                </div>
              </div>
            </div>

            {/* Stat comparison */}
            <div className={s.statTable}>
              {statRows.map((row) => (
                <div key={row.label} className={`${s.statRow} ${row.dmg ? s.statRowDmg : ''}`}>
                  <span className={s.statLabel}>{row.label}</span>
                  <span className={`${s.statValP} ${cls(row.p, row.w)}`}>{row.pText ?? row.p}</span>
                  <span className={`${s.statValW} ${cls(row.w, row.p)}`}>{row.w}</span>
                </div>
              ))}
            </div>

            {/* Fight! */}
            <button className={`${s.fightBtnBig} glowY`} onClick={handleFight}>
              ⚔️ Fight!
            </button>
          </>
        )}
      </div>
    </div>
  );
}
