/**
 * Dungeon screen — encounter stream.
 *
 * Design: no room-map. The player is immediately presented with the first
 * encounter when they enter the floor. Fights are mandatory (no Flee).
 * "Return to Town" is always visible so the player can exit at any time.
 * After each victory the next encounter auto-advances. When all encounters
 * on the floor are done a "Floor Complete" card offers descent or town exit.
 *
 * Visual reference: reference/mathdex_dungeon.jsx (header + arena sections)
 * Colours: src/styles/tokens.ts (inline for type-dynamic; CSS module for statics)
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useShallow }               from 'zustand/react/shallow';

import { useGameStore, useActiveTrainer, getPartyPokemon, isItemSystemActive, getPartyHighestLevel, getLeadInstanceId } from '../../store/gameStore';
import { useDungeonStore } from '../../store/dungeonStore';
import { useBattleStore }  from '../../store/battleStore';
import { usePartyDisplay } from '../../hooks/usePartyDisplay';
import PartyMemberCard from '../../components/PartyMemberCard';
import { typeColors, RARITY_COLORS, FONT_PIXEL, FONT_UI } from '../../styles/tokens';
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

// ── TypeBadge (local until moved to components/ui) ────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const c = typeColors(type);
  return (
    <span
      className={s.typeBadge}
      style={{ background: c.bg, color: c.fg, border: `1px solid ${c.bdr}` }}
    >
      {type}
    </span>
  );
}

// ── EncounterCard — inline (no Sheet overlay) ─────────────────────────────────

interface EncounterCardProps {
  encounter:        EncounterData;
  battlePhase:      BattlePhase;
  leadDexNumber:    number;
  itemSystemActive: boolean;
  isBossFloor:      boolean;
  floorNumber:      number;
  expGains?:        ExpGainEntry[];
  pokeReward?:      number;
  onFight:          () => void;
  onNext:           () => void;
}

function EncounterCard({
  encounter, battlePhase, itemSystemActive, isBossFloor, floorNumber,
  expGains, pokeReward, onFight, onNext, // leadDexNumber unused in current layout
}: EncounterCardProps) {
  const isBoss   = encounter.rarity === 'Rare' && isBossFloor;
  const species  = getSpecies(encounter.speciesId);
  const types    = species?.types ?? [encounter.type];
  const stats    = species ? calcAllStats(species.baseStats, encounter.level) : null;
  const rc       = RARITY_COLORS[encounter.rarity] ?? RARITY_COLORS.Common;

  return (
    <div className={s.encounterCard}
      style={{ borderColor: isBoss ? '#F8D030' : '#3a3d5c' }}>

      {/* ── PRE-BATTLE ─────────────────────────────────────────────────── */}
      {battlePhase === 'pre' && (
        <div className={`${s.encounterCardBody} fade-up`}>

          {/* Header label */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: '#8892b8', letterSpacing: 1.5 }}>
              {isBoss ? '★ BOSS ENCOUNTER' : 'WILD POKÉMON'}
            </span>
            {itemSystemActive && (
              <span style={{ fontSize: 14, opacity: 0.85 }} title="Carries an item">📦</span>
            )}
          </div>

          {/* Sprite + name + types + HP */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
            {/* Sprite */}
            <img
              src={getIdleSpriteUrl(encounter.dexNumber)}
              alt={encounter.speciesName}
              style={{
                width: 72, height: 72, flexShrink: 0,
                imageRendering: 'pixelated', objectFit: 'contain',
                filter: `drop-shadow(0 4px 12px rgba(0,0,0,.8))${isBoss ? ' drop-shadow(0 0 14px #FFCB0560)' : ''}`,
              }}
            />

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
                <span style={{ fontFamily: FONT_UI, fontSize: 20, fontWeight: 900, color: '#f0f4ff', lineHeight: 1 }}>
                  {encounter.speciesName}
                </span>
                <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#8892b8' }}>
                  Lv{encounter.level}
                </span>
              </div>

              {/* Type badges — supports dual types */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {types.map((type) => <TypeBadge key={type} type={type} />)}
              </div>

              {/* HP bar */}
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
                <div key={label} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 7,
                  background: '#2a2d45', border: '1px solid #3a3d5c',
                  borderRadius: 10, padding: '7px 10px',
                }}>
                  <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
                  <div>
                    <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: '#f0f4ff', lineHeight: 1.4 }}>{val}</div>
                    <div style={{ fontFamily: FONT_UI, fontSize: 10, color: '#8892b8', fontWeight: 700 }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rarity + floor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: rc.fg, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT_UI, fontSize: 12, color: rc.fg, fontWeight: 700 }}>{encounter.rarity}</span>
            <span style={{ fontFamily: FONT_UI, fontSize: 12, color: '#8892b8' }}>· Floor {floorNumber}</span>
          </div>

          {/* Fight button */}
          <button className={`${s.fightBtn} glowY`} style={{ width: '100%' }} onClick={onFight}>
            ⚔️ {isBoss ? 'Challenge Boss!' : 'Fight!'}
          </button>
        </div>
      )}

      {/* ── WON ────────────────────────────────────────────────────────── */}
      {battlePhase === 'won' && (
        <div className={`${s.encounterCardBody} ${s.wonContent} fade-up`}>
          <div className={s.wonEmoji}>{isBoss ? '🏆' : '🎉'}</div>
          <div className={s.wonTitle}>{isBoss ? 'BOSS DEFEATED!' : 'VICTORY!'}</div>
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
                    <span style={{ fontFamily: FONT_UI, fontSize: 13, fontWeight: 800, color: '#f0f4ff', textTransform: 'capitalize' }}>{g.name}</span>
                    <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#6890F0', marginLeft: 8 }}>+{g.expAdded} EXP</span>
                  </div>
                  {g.newLevel > g.oldLevel && (
                    <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: '#F8D030', background: '#1a1400', border: '1px solid #F8D030', borderRadius: 5, padding: '3px 6px', flexShrink: 0 }}>
                      LV{g.newLevel}!
                    </span>
                  )}
                </div>
              ))}
              {itemSystemActive && (
                <div className={s.wonRewards} style={{ marginTop: 4 }}>1 item dropped</div>
              )}
            </div>
          ) : (
            <div className={s.wonRewards}>
              {itemSystemActive && '1 item dropped'}
            </div>
          )}

          <button className={`${s.ctaYellow} glowY`} onClick={onNext}>
            Next Encounter →
          </button>
        </div>
      )}
    </div>
  );
}

// ── FloorCompleteCard ─────────────────────────────────────────────────────────

interface FloorCompleteCardProps {
  floorNumber:    number;
  isBossFloor:    boolean;
  defeatedCount:  number;
  onDescend:      () => void;
  onReturnToTown: () => void;
}

function FloorCompleteCard({
  floorNumber, isBossFloor, defeatedCount, onDescend, onReturnToTown,
}: FloorCompleteCardProps) {
  const nextIsBoss = (floorNumber + 1) % 5 === 0;
  return (
    <div className={`${s.floorComplete} fade-up`}>
      <div className={s.floorCompleteEmoji}>{isBossFloor ? '🏆' : '✅'}</div>
      <div className={s.floorCompleteTitle}>
        {isBossFloor ? `FLOOR ${floorNumber} CLEARED!` : `FLOOR ${floorNumber} COMPLETE`}
      </div>
      <div className={s.floorCompleteText}>
        {defeatedCount} Pokémon defeated.
        {isBossFloor
          ? ' The next floor block is now unlocked!'
          : nextIsBoss
            ? ` Floor ${floorNumber + 1} ahead is a boss floor — prepare!`
            : ' Descend deeper or return to town to heal.'}
      </div>
      <div className={s.floorCompleteBtns}>
        <button className={s.ctaGreen} onClick={onDescend}>
          ⬇️ Descend to FL.{floorNumber + 1}
        </button>
        <button className={s.backBtn} onClick={onReturnToTown}>
          ← Town
        </button>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DungeonScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  const trainer = useActiveTrainer();
  const { setCurrentFloor, setMaxPartySize, setLead } = useGameStore(
    useShallow((gs) => ({
      setCurrentFloor:  gs.setCurrentFloor,
      setMaxPartySize:  gs.setMaxPartySize,
      setLead:          gs.setLead,
    })),
  );

  const { floor: dungeonFloor, enterFloor, clearRoom } = useDungeonStore(
    useShallow((ds) => ({ floor: ds.floor, enterFloor: ds.enterFloor, clearRoom: ds.clearRoom })),
  );

  const startBattle = useBattleStore((s) => s.startBattle);

  const party           = getPartyPokemon(trainer);
  const itemActive      = isItemSystemActive(trainer);
  const currentFloor    = trainer.currentFloor;

  // ── Floor generation lifecycle ─────────────────────────────────────────────
  useEffect(() => {
    if (dungeonFloor?.floorNumber !== currentFloor) {
      enterFloor(currentFloor, getPartyHighestLevel(trainer));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFloor]);

  // ── Encounter state ────────────────────────────────────────────────────────
  // The encounter index is DERIVED from how many encounter rooms are cleared in
  // the dungeonStore (which persists across the remounts caused by navigating to
  // /battle and back). This keeps progress stable and makes both victory and
  // catch advance the stream. See `currentEncounterIdx` below.
  const [battlePhase, setBattlePhase]       = useState<BattlePhase>('pre');
  const [lastExpGains, setLastExpGains]     = useState<ExpGainEntry[]>([]);
  const [lastPokeReward, setLastPokeReward] = useState<number | undefined>(undefined);
  // Process each battle outcome exactly once per mount. A ref guard is required
  // because StrictMode double-invokes mount effects in dev — without it the
  // catch handler's clearRoom would fire twice and skip an encounter.
  const outcomeHandledRef = useRef(false);

  // Read battle outcome passed back from BattleScreen via navigation state
  useEffect(() => {
    if (outcomeHandledRef.current) return;
    outcomeHandledRef.current = true;
    const state   = (location.state as Record<string, unknown> | null);
    const outcome = state?.battleOutcome;
    if (outcome === 'victory') {
      setBattlePhase('won');
      setLastExpGains((state?.expGains as ExpGainEntry[] | undefined) ?? []);
      setLastPokeReward(state?.pokeReward as number | undefined);
    } else if (outcome === 'caught') {
      // Caught Pokémon counts as defeated — clear that room and continue to the next.
      const floor = useDungeonStore.getState().floor;
      const rooms = (floor?.rooms ?? []).filter(
        (r) => (r.type === 'encounter' || r.type === 'boss') && r.encounter,
      );
      const justFought = rooms.find((r) => !r.cleared);
      if (justFought) clearRoom(justFought.id);
      setBattlePhase('pre');
    }
    // 'fled' keeps the current 'pre' phase — player sees the encounter again
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Party display ──────────────────────────────────────────────────────────
  const displayParty  = usePartyDisplay(trainer.party, trainer.caughtPokemon);
  const leadId        = getLeadInstanceId(trainer);
  const leadPokemon   = party.find((p) => p.instanceId === leadId) ?? party[0] ?? null;
  const totalPotions  = trainer.potions.potion + trainer.potions.superPotion + trainer.potions.hyperPotion;

  // Choose which party Pokémon leads (fights) — marks it in place (no reorder).
  const handleSelectLead = useCallback((instanceId: string) => setLead(instanceId), [setLead]);

  // ── Derived encounter data from the generated floor ────────────────────────
  const encounterRooms = useMemo(
    () =>
      (dungeonFloor?.rooms ?? []).filter(
        (r) => (r.type === 'encounter' || r.type === 'boss') && r.encounter,
      ),
    [dungeonFloor],
  );

  const totalEncounters   = encounterRooms.length;
  // Derived from cleared rooms — survives the remount on each /battle round-trip.
  const currentEncounterIdx = encounterRooms.filter((r) => r.cleared).length;
  const currentEncounter  = encounterRooms[currentEncounterIdx]?.encounter ?? null;
  const isFloorComplete   = currentEncounterIdx >= totalEncounters && totalEncounters > 0;

  // ── Battle handlers ────────────────────────────────────────────────────────
  const handleFight = useCallback(() => {
    if (!currentEncounter || !leadPokemon) return;
    const enemy = buildEnemyPokemon(currentEncounter);
    startBattle(enemy, leadPokemon.instanceId);
    navigate('/battle');
  }, [currentEncounter, leadPokemon, startBattle, navigate]);

  const handleNextEncounter = useCallback(() => {
    // The just-beaten encounter is the first room that is not yet cleared.
    const currentRoom = encounterRooms.find((r) => !r.cleared);

    if (currentRoom) clearRoom(currentRoom.id);

    // Boss defeat → expand max party size
    if (currentRoom?.type === 'boss') {
      setMaxPartySize(Math.min(6, trainer.maxPartySize + 1));
    }

    setBattlePhase('pre');
    setLastExpGains([]);
    setLastPokeReward(undefined);
  }, [encounterRooms, clearRoom, setMaxPartySize, trainer.maxPartySize]);

  const handleDescend = useCallback(() => {
    const nextFloor = currentFloor + 1;
    setCurrentFloor(nextFloor);
    enterFloor(nextFloor, getPartyHighestLevel(trainer));   // regenerates → all rooms uncleared → idx resets to 0
    setBattlePhase('pre');
  }, [currentFloor, setCurrentFloor, enterFloor, trainer]);

  const handleReturnToTown = useCallback(() => navigate('/'), [navigate]);

  // ── Loading guard (all hooks above this line) ──────────────────────────────
  if (!dungeonFloor) {
    return (
      <div className={s.screen} style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#FFCB05' }}>
          ENTERING FLOOR {currentFloor}…
        </span>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.screen}>

      {/* ══ TOP BAR ═══════════════════════════════════════════════════════ */}
      <div className={s.topBar}>
        <div className={s.topBarMeta}>
          <div>
            <div className={s.floorLabel}>DUNGEON</div>
            <div className={s.floorNumber}>
              Floor {currentFloor}{dungeonFloor.isBossFloor ? ' ★' : ''}
            </div>
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

      {/* ══ ENCOUNTER STREAM ══════════════════════════════════════════════ */}
      <div className={s.encounterContent}>

        {/* Progress row */}
        <div className={s.progressRow}>
          <div className={s.progressText}>
            {Math.min(currentEncounterIdx + 1, totalEncounters)} / {totalEncounters} Pokémon encountered
          </div>
        </div>

        {/* Floor complete card OR current encounter (keyed so fade-up fires on advance) */}
        {isFloorComplete ? (
          <FloorCompleteCard
            floorNumber={currentFloor}
            isBossFloor={dungeonFloor.isBossFloor}
            defeatedCount={currentEncounterIdx}
            onDescend={handleDescend}
            onReturnToTown={handleReturnToTown}
          />
        ) : currentEncounter ? (
          <div key={currentEncounterIdx}>
            <EncounterCard
              encounter={currentEncounter}
              battlePhase={battlePhase}
              leadDexNumber={displayParty.find((p) => p.instanceId === leadId)?.dexNumber ?? 25}
              itemSystemActive={itemActive}
              isBossFloor={dungeonFloor.isBossFloor}
              floorNumber={currentFloor}
              expGains={lastExpGains}
              pokeReward={lastPokeReward}
              onFight={handleFight}
              onNext={handleNextEncounter}
            />
          </div>
        ) : (
          /* Edge case: floor generated with no encounter rooms */
          <div className={s.floorComplete}>
            <div className={s.floorCompleteEmoji}>🌑</div>
            <div className={s.floorCompleteTitle}>FLOOR EMPTY</div>
            <div className={s.floorCompleteText}>No encounters on this floor.</div>
          </div>
        )}

        {/* Return to Town — always visible unless floor complete (which has its own exit) */}
        {!isFloorComplete && (
          <button className={s.returnBtn} onClick={handleReturnToTown}>
            ← Return to Town
          </button>
        )}
      </div>
    </div>
  );
}
