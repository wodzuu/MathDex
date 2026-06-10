/**
 * Dungeon screen — three wild opponents on offer at once.
 *
 * There are no floors or rooms. The player is shown THREE wild Pokémon and picks
 * one to fight. Defeating or catching an opponent replaces only that card with a
 * fresh roll; the other two remain available. Fleeing leaves the card untouched.
 * Difficulty (enemy level + math) scales with the player's strongest Pokémon.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useShallow }               from 'zustand/react/shallow';

import { useGameStore, useActiveTrainer, getPartyPokemon, isItemSystemActive, getPartyHighestLevel, getLeadInstanceId } from '../../store/gameStore';
import { useDungeonStore } from '../../store/dungeonStore';
import { useBattleStore }  from '../../store/battleStore';
import { usePartyDisplay } from '../../hooks/usePartyDisplay';
import PartyMemberCard from '../../components/PartyMemberCard';
import RarityBadge from '../../components/RarityBadge';
import { typeColors, FONT_PIXEL, RARITY_COLORS } from '../../styles/tokens';
import { getSpecies }      from '../../data/species';
import { getMove }         from '../../data/moves';
import { calcHp, calcAllStats, expToLevel } from '../../lib/formulas';
import { getIdleSpriteUrl } from '../../lib/sprites';

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

// ── EncounterCard (pre-battle only) ───────────────────────────────────────────

interface EncounterCardProps {
  encounter:        EncounterData;
  itemSystemActive: boolean;
  onFight:          () => void;
}

function EncounterCard({ encounter, itemSystemActive, onFight }: EncounterCardProps) {
  const species  = getSpecies(encounter.speciesId);
  const types    = species?.types ?? [encounter.type];
  const stats    = species ? calcAllStats(species.baseStats, encounter.level) : null;
  // Colour-code the card by the opponent's rarity (border + subtle glow).
  const rc       = RARITY_COLORS[encounter.rarity] ?? RARITY_COLORS.Common;

  return (
    <div className={s.encounterCard} style={{ borderColor: rc.fg, boxShadow: `0 0 14px ${rc.fg}33` }}>
      <div className={`${s.encounterCardBody} fade-up`}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: '#8892b8', letterSpacing: 1.5 }}>
            WILD POKÉMON
          </span>
          {itemSystemActive && (
            <span style={{ fontSize: 14, opacity: 0.85 }} title="Carries an item">📦</span>
          )}
        </div>

        {/* Sprite + name + types + HP */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
          <img
            src={getIdleSpriteUrl(encounter.dexNumber)}
            alt={encounter.speciesName}
            style={{ width: 64, height: 64, flexShrink: 0, imageRendering: 'pixelated', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.8))' }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
              <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 18, fontWeight: 900, color: '#f0f4ff', lineHeight: 1 }}>
                {encounter.speciesName}
              </span>
              <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#8892b8' }}>Lv{encounter.level}</span>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {types.map((type) => <TypeBadge key={type} type={type} />)}
              <RarityBadge rarity={encounter.rarity} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: '#f0f4ff', flexShrink: 0 }}>HP</span>
              <div style={{ flex: 1, height: 8, background: '#111', border: '1px solid #ffffff20', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#48c774', borderRadius: 4 }} />
              </div>
              <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: '#8892b8', minWidth: 44, textAlign: 'right' }}>
                {stats?.maxHp ? `${stats.maxHp}/${stats.maxHp}` : '100%'}
              </span>
            </div>
          </div>
        </div>

        {/* Stat chips */}
        {stats && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {([
              { icon: '⚔️', label: 'Atk', val: stats.attack  },
              { icon: '🛡️', label: 'Def', val: stats.defense },
              { icon: '💨', label: 'Spd', val: stats.speed   },
            ] as const).map(({ icon, label, val }) => (
              <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, background: '#2a2d45', border: '1px solid #3a3d5c', borderRadius: 10, padding: '7px 10px' }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
                <div>
                  <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: '#f0f4ff', lineHeight: 1.4 }}>{val}</div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, color: '#8892b8', fontWeight: 700 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className={`${s.fightBtn} glowY`} style={{ width: '100%' }} onClick={onFight}>
          ⚔️ Fight!
        </button>
      </div>
    </div>
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

  const startBattle = useBattleStore((s) => s.startBattle);

  const party       = getPartyPokemon(trainer);
  const itemActive  = isItemSystemActive(trainer);

  // Track the highest-level opponent the player has encountered (persisted).
  useEffect(() => {
    encounters.forEach((e) => recordOpponentLevel(e.level));
  }, [encounters, recordOpponentLevel]);

  const [outcomeBanner, setOutcomeBanner] = useState<OutcomeBanner | null>(null);
  // Process each battle outcome exactly once per mount (StrictMode-safe).
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
    // Make sure the dungeon is stocked (e.g. on first entry / direct nav).
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

  // ── Party display ──────────────────────────────────────────────────────────
  const displayParty  = usePartyDisplay(trainer.party, trainer.caughtPokemon);
  const leadId        = getLeadInstanceId(trainer);
  const leadPokemon   = party.find((p) => p.instanceId === leadId) ?? party[0] ?? null;
  const totalPotions  = trainer.potions.potion + trainer.potions.superPotion + trainer.potions.hyperPotion;

  const handleSelectLead = useCallback((instanceId: string) => setLead(instanceId), [setLead]);

  // ── Battle handler ─────────────────────────────────────────────────────────
  const handleFight = useCallback((index: number) => {
    const enc = useDungeonStore.getState().encounters[index];
    if (!enc || !leadPokemon) return;
    useDungeonStore.getState().selectEncounter(index);
    startBattle(buildEnemyPokemon(enc), leadPokemon.instanceId);
    navigate('/battle');
  }, [leadPokemon, startBattle, navigate]);

  const handleReturnToTown = useCallback(() => navigate('/'), [navigate]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.screen}>

      {/* ══ TOP BAR ═══════════════════════════════════════════════════════ */}
      <div className={s.topBar}>
        <div className={s.topBarMeta}>
          <div>
            <div className={s.floorLabel}>DUNGEON</div>
            <div className={s.floorNumber}>Wild Battles</div>
          </div>
          <div className={s.topBarRight}>
            <div className={s.econGroup}>
              <div className={s.econLabel}>POTIONS</div>
              <div className={s.econValue} style={{ color: totalPotions > 1 ? '#48c774' : '#CC0000' }}>
                🧪×{totalPotions}
              </div>
            </div>
            <div className={s.econGroup}>
              <div className={s.econLabel}>₽</div>
              <div className={s.econValue} style={{ color: '#FFCB05' }}>
                {trainer.pokeDollars.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Party strip — tap a Pokémon to make it the lead (the one that fights). */}
        {displayParty.length > 1 && (
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: '#8892b8', padding: '0 0 4px 2px' }}>
            TAP A POKÉMON TO LEAD
          </div>
        )}
        <div className={s.partyStrip}>
          {displayParty.map((pk) => (
            <PartyMemberCard
              key={pk.instanceId}
              pk={pk}
              isLead={pk.instanceId === leadId}
              frameLead
              onClick={() => handleSelectLead(pk.instanceId)}
            />
          ))}
        </div>
      </div>

      {/* ══ OUTCOME BANNER ════════════════════════════════════════════════ */}
      {outcomeBanner && <OutcomeBanner banner={outcomeBanner} onClose={() => setOutcomeBanner(null)} />}

      {/* ══ ENCOUNTERS (3) ════════════════════════════════════════════════ */}
      <div className={s.encounterContent}>
        {encounters.length === 0 ? (
          <div className={s.floorComplete}>
            <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#FFCB05' }}>FINDING WILD POKÉMON…</span>
          </div>
        ) : (
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: '#8892b8', padding: '0 0 2px 2px' }}>
            CHOOSE AN OPPONENT
          </div>
        )}

        {encounters.map((enc, i) => (
          <EncounterCard
            key={enc.id}
            encounter={enc}
            itemSystemActive={itemActive}
            onFight={() => handleFight(i)}
          />
        ))}

        <button className={s.returnBtn} onClick={handleReturnToTown}>
          ← Return to Town
        </button>
      </div>
    </div>
  );
}
