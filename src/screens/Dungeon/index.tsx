/**
 * Dungeon screen — an infinite stream of single wild encounters.
 *
 * There are no floors or rooms. The player faces one wild Pokémon at a time;
 * after each victory/catch a fresh one appears. Difficulty (enemy level + math)
 * scales with the player's strongest Pokémon. "Return to Town" always exits.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useShallow }               from 'zustand/react/shallow';

import { useGameStore, useActiveTrainer, getPartyPokemon, isItemSystemActive, getPartyHighestLevel, getLeadInstanceId } from '../../store/gameStore';
import { useDungeonStore } from '../../store/dungeonStore';
import { useBattleStore }  from '../../store/battleStore';
import { usePartyDisplay } from '../../hooks/usePartyDisplay';
import PartyMemberCard from '../../components/PartyMemberCard';
import RarityBadge from '../../components/RarityBadge';
import { typeColors, FONT_PIXEL } from '../../styles/tokens';
import { getSpecies }      from '../../data/species';
import { getMove }         from '../../data/moves';
import { calcHp, calcAllStats, expToLevel } from '../../lib/formulas';
import { getIdleSpriteUrl } from '../../lib/sprites';

import type { EncounterData } from '../../types/dungeon';
import type { OwnedPokemon } from '../../types/gameState';

import s from './Dungeon.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type BattlePhase = 'pre' | 'won';

interface ExpGainEntry {
  instanceId: string;
  name:       string;
  dexNumber:  number;
  expAdded:   number;
  oldLevel:   number;
  newLevel:   number;
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

// ── EncounterCard ─────────────────────────────────────────────────────────────

interface EncounterCardProps {
  encounter:        EncounterData;
  battlePhase:      BattlePhase;
  itemSystemActive: boolean;
  expGains?:        ExpGainEntry[];
  pokeReward?:      number;
  onFight:          () => void;
  onNext:           () => void;
}

function EncounterCard({ encounter, battlePhase, itemSystemActive, expGains, pokeReward, onFight, onNext }: EncounterCardProps) {
  const species  = getSpecies(encounter.speciesId);
  const types    = species?.types ?? [encounter.type];
  const stats    = species ? calcAllStats(species.baseStats, encounter.level) : null;

  return (
    <div className={s.encounterCard} style={{ borderColor: '#3a3d5c' }}>

      {/* ── PRE-BATTLE ─────────────────────────────────────────────────── */}
      {battlePhase === 'pre' && (
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
              style={{ width: 72, height: 72, flexShrink: 0, imageRendering: 'pixelated', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.8))' }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
                <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 20, fontWeight: 900, color: '#f0f4ff', lineHeight: 1 }}>
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
      )}

      {/* ── WON ────────────────────────────────────────────────────────── */}
      {battlePhase === 'won' && (
        <div className={`${s.encounterCardBody} ${s.wonContent} fade-up`}>
          <div className={s.wonEmoji}>🎉</div>
          <div className={s.wonTitle}>VICTORY!</div>
          <div className={s.wonDefeated}>{encounter.speciesName} was defeated!</div>

          {expGains && expGains.length > 0 ? (
            <div style={{ width: '100%', marginBottom: 12 }}>
              {pokeReward != null && (
                <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: '#F8D030', marginBottom: 8, textAlign: 'center' }}>
                  ₽{pokeReward.toLocaleString()} earned!
                </div>
              )}
              {expGains.map((g) => (
                <div key={g.instanceId} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,.25)', borderRadius: 8, padding: '7px 10px', marginBottom: 6 }}>
                  <img src={getIdleSpriteUrl(g.dexNumber)} alt={g.name} style={{ width: 28, height: 28, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, color: '#f0f4ff', textTransform: 'capitalize' }}>{g.name}</span>
                    <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#6890F0', marginLeft: 8 }}>+{g.expAdded} EXP</span>
                  </div>
                  {g.newLevel > g.oldLevel && (
                    <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: '#F8D030', background: '#1a1400', border: '1px solid #F8D030', borderRadius: 5, padding: '3px 6px', flexShrink: 0 }}>
                      LV{g.newLevel}!
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <button className={`${s.ctaYellow} glowY`} onClick={onNext}>
            Next Encounter →
          </button>
        </div>
      )}
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

  const { encounter, rollEncounter } = useDungeonStore(
    useShallow((ds) => ({ encounter: ds.encounter, rollEncounter: ds.rollEncounter })),
  );

  // Track the highest-level opponent the player has encountered (persisted).
  useEffect(() => {
    if (encounter) recordOpponentLevel(encounter.level);
  }, [encounter, recordOpponentLevel]);

  const startBattle = useBattleStore((s) => s.startBattle);

  const party       = getPartyPokemon(trainer);
  const itemActive  = isItemSystemActive(trainer);

  const [battlePhase, setBattlePhase]       = useState<BattlePhase>('pre');
  const [lastExpGains, setLastExpGains]     = useState<ExpGainEntry[]>([]);
  const [lastPokeReward, setLastPokeReward] = useState<number | undefined>(undefined);
  // Process each battle outcome exactly once per mount (StrictMode-safe).
  const outcomeHandledRef = useRef(false);

  // Read battle outcome passed back from BattleScreen via navigation state.
  useEffect(() => {
    if (outcomeHandledRef.current) return;
    outcomeHandledRef.current = true;
    const state   = (location.state as Record<string, unknown> | null);
    const outcome = state?.battleOutcome;

    if (outcome === 'victory') {
      // Keep the defeated encounter on screen for the victory card.
      setBattlePhase('won');
      setLastExpGains((state?.expGains as ExpGainEntry[] | undefined) ?? []);
      setLastPokeReward(state?.pokeReward as number | undefined);
    } else if (outcome === 'caught' || outcome === 'fled') {
      // Caught/fled — a fresh wild Pokémon appears.
      rollEncounter(getPartyHighestLevel(trainer), itemActive);
      setBattlePhase('pre');
    } else if (!useDungeonStore.getState().encounter) {
      // Direct navigation with no encounter loaded — roll one.
      rollEncounter(getPartyHighestLevel(trainer), itemActive);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Party display ──────────────────────────────────────────────────────────
  const displayParty  = usePartyDisplay(trainer.party, trainer.caughtPokemon);
  const leadId        = getLeadInstanceId(trainer);
  const leadPokemon   = party.find((p) => p.instanceId === leadId) ?? party[0] ?? null;
  const totalPotions  = trainer.potions.potion + trainer.potions.superPotion + trainer.potions.hyperPotion;

  const handleSelectLead = useCallback((instanceId: string) => setLead(instanceId), [setLead]);

  // ── Battle handlers ────────────────────────────────────────────────────────
  const handleFight = useCallback(() => {
    if (!encounter || !leadPokemon) return;
    startBattle(buildEnemyPokemon(encounter), leadPokemon.instanceId);
    navigate('/battle');
  }, [encounter, leadPokemon, startBattle, navigate]);

  const handleNextEncounter = useCallback(() => {
    rollEncounter(getPartyHighestLevel(trainer), itemActive);
    setBattlePhase('pre');
    setLastExpGains([]);
    setLastPokeReward(undefined);
  }, [rollEncounter, trainer, itemActive]);

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

      {/* ══ ENCOUNTER ═════════════════════════════════════════════════════ */}
      <div className={s.encounterContent}>
        {encounter ? (
          <EncounterCard
            encounter={encounter}
            battlePhase={battlePhase}
            itemSystemActive={itemActive}
            expGains={lastExpGains}
            pokeReward={lastPokeReward}
            onFight={handleFight}
            onNext={handleNextEncounter}
          />
        ) : (
          <div className={s.floorComplete}>
            <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#FFCB05' }}>FINDING A WILD POKÉMON…</span>
          </div>
        )}

        <button className={s.returnBtn} onClick={handleReturnToTown}>
          ← Return to Town
        </button>
      </div>
    </div>
  );
}
