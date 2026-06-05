/**
 * Town screen — the hub the player returns to between dungeon runs.
 *
 * Visual reference: reference/mathdex_mockups.jsx  TownScreen({ phase })
 *
 * Locations:
 *   🏥 Pokémon Center — free full heal + PP restore
 *   🛒 Pokémart       — buy Potions and Balls (stub nav)
 *   🔬 Oak's Lab      — identify items (locked until itemSystemActive)
 *   💻 PC Terminal    — party / PC Box management (stub nav)
 *   ⬇️ Dungeon Entrance — generate floor, navigate to /dungeon
 */

import { useCallback, useState } from 'react';
import { useNavigate }           from 'react-router-dom';

import { useGameStore, useActiveTrainer, isItemSystemActive } from '../../store/gameStore';
import { useDungeonStore } from '../../store/dungeonStore';
import { usePartyDisplay } from '../../hooks/usePartyDisplay';
import { getIdleSpriteUrl } from '../../lib/sprites';

import s from './Town.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hpColor(pct: number): string {
  if (pct > 50) return '#48c774';
  if (pct > 20) return '#FFCB05';
  return '#CC0000';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TownScreen() {
  const navigate = useNavigate();
  const [healFlash, setHealFlash] = useState(false);

  const trainer = useActiveTrainer();
  const healParty = useGameStore(s => s.healParty);
  const enterFloor = useDungeonStore((s) => s.enterFloor);

  // ── Party display ──────────────────────────────────────────────────────────
  const displayParty = usePartyDisplay(trainer.party, trainer.caughtPokemon);

  // ── Derived ────────────────────────────────────────────────────────────────
  const itemActive = isItemSystemActive(trainer);
  const totalPotions =
    trainer.potions.potion + trainer.potions.superPotion + trainer.potions.hyperPotion;

  // ── Pokémon Center heal ────────────────────────────────────────────────────
  const handleHeal = useCallback(() => {
    healParty();
    setHealFlash(true);
    setTimeout(() => setHealFlash(false), 1200);
  }, [healParty]);

  // ── Enter dungeon ──────────────────────────────────────────────────────────
  const handleEnterDungeon = useCallback(() => {
    enterFloor(trainer.currentFloor);
    navigate('/dungeon');
  }, [trainer.currentFloor, enterFloor, navigate]);

  // ── Derived: is the current floor a boss floor? ────────────────────────────
  const isBossFloor = trainer.currentFloor % 5 === 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.screen}>

      {/* ══ HEADER ════════════════════════════════════════════════════════ */}
      <div className={s.header}>
        <div className={s.headerRow}>
          <div>
            <div className={s.townLabel}>TOWN HUB</div>
            <div className={s.townName}>Oak Island</div>
          </div>
          <div className={s.moneyCard}>
            <div className={s.moneyLabel}>POKÉDOLLARS</div>
            <div className={s.moneyValue}>₽{trainer.pokeDollars.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className={s.content}>

        {/* ══ PARTY STRIP ═══════════════════════════════════════════════════ */}
        <div className={s.partyCard}>
          <div className={s.partyCardLabel}>PARTY</div>

          {displayParty.map((pk) => {
            return (
              <div key={pk.instanceId} className={s.partyMember}>
                <img src={getIdleSpriteUrl(pk.dexNumber)} alt={pk.name} style={{ width: 52, height: 52, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }} />
                <div className={s.partyMemberInfo}>
                  <div className={s.partyMemberNameRow}>
                    <span className={s.partyMemberName}>{pk.name}</span>
                    <span className={s.partyMemberLv}>Lv{pk.level}</span>
                  </div>
                  <div className={s.hpRow}>
                    <span className={s.hpLabel}>HP</span>
                    <div className={s.hpTrack}>
                      <div
                        className={s.hpFill}
                        style={{
                          width:      `${pk.hpPct}%`,
                          background: hpColor(pk.hpPct),
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ PHASE NOTICE ══════════════════════════════════════════════════ */}
        {!itemActive ? (
          <div className={`${s.phaseNotice} ${s.phaseNoticePhase1}`}>
            ⚡ Level any Pokémon to <strong>Lv&nbsp;20</strong> to unlock the
            item system and open Oak's lab.
          </div>
        ) : (
          <div className={`${s.phaseNotice} ${s.phaseNoticePhase2}`}>
            ✨ <strong>Item system active!</strong>{' '}
            <span style={{ color: '#8892b8', fontWeight: 600 }}>
              Wild Pokémon now carry items.
            </span>
          </div>
        )}

        {/* ══ LOCATIONS ═════════════════════════════════════════════════════ */}
        <div className={s.sectionLabel}>LOCATIONS</div>

        <div className={s.locationGrid}>
          {/* Pokémon Center */}
          <button
            className={s.locationTile}
            onClick={handleHeal}
            style={{ border: healFlash ? '2px solid #48c774' : undefined }}
          >
            <span className={s.locationIcon}>🏥</span>
            <span className={s.locationName}>Pokémon Center</span>
            <span className={s.locationSub} style={{ color: '#CC0000' }}>
              {healFlash ? 'Healed! ✓' : 'Heal party · Free'}
            </span>
          </button>

          {/* Pokémart */}
          <button
            className={s.locationTile}
            onClick={() => navigate('/mart')}
          >
            <span className={s.locationIcon}>🛒</span>
            <span className={s.locationName}>Pokémart</span>
            <span className={s.locationSub} style={{ color: '#6890F0' }}>
              Potions &amp; Balls
            </span>
          </button>

          {/* Oak's Lab */}
          <button
            className={`${s.locationTile} ${!itemActive ? s.locked : ''}`}
            disabled={!itemActive}
            onClick={() => navigate('/identify')}
          >
            {!itemActive && <span className={s.lockIcon}>🔒</span>}
            <span className={s.locationIcon}>🔬</span>
            <span className={s.locationName}>Oak's Lab</span>
            <span className={s.locationSub} style={{ color: '#FFCB05' }}>
              {itemActive ? 'Identify items' : 'Reach Lv 20 to unlock'}
            </span>
          </button>

          {/* PC Terminal */}
          <button
            className={s.locationTile}
            onClick={() => navigate('/pc')}
          >
            <span className={s.locationIcon}>💻</span>
            <span className={s.locationName}>PC Terminal</span>
            <span className={s.locationSub} style={{ color: '#48c774' }}>
              Party &amp; PC Box
            </span>
          </button>
        </div>

        {/* ── Dungeon entrance (full width) ─────────────────────────────── */}
        <button className={s.dungeonTile} onClick={handleEnterDungeon}>
          <span className={s.dungeonTileIcon}>⬇️</span>
          <div className={s.dungeonTileInfo}>
            <div className={s.dungeonTileName}>Dungeon Entrance</div>
            <div className={s.dungeonTileSub}>
              {totalPotions > 0
                ? `${totalPotions} Potion${totalPotions !== 1 ? 's' : ''} ready · Floor ${trainer.currentFloor}`
                : `No potions — heal first · Floor ${trainer.currentFloor}`}
            </div>
          </div>
          <div
            className={s.dungeonBadge}
            style={
              isBossFloor
                ? { background: '#2a1800', color: '#F8D030', border: '1px solid #4a3000' }
                : { background: '#180818', color: '#9070B8', border: '1px solid #301030' }
            }
          >
            {isBossFloor ? `FL.${trainer.currentFloor} BOSS` : `FL.${trainer.currentFloor} →`}
          </div>
        </button>

        {/* ══ TRAINER CARD ══════════════════════════════════════════════════ */}
        <div className={s.sectionLabel}>TRAINER CARD</div>
        <div className={s.trainerCard}>
          <div className={s.trainerStat}>
            <div className={s.trainerStatValue} style={{ color: '#48c774' }}>
              {trainer.stats.totalProblemsSolved}
            </div>
            <div className={s.trainerStatLabel}>Correct</div>
          </div>
          <div className={s.trainerStat}>
            <div className={s.trainerStatValue} style={{ color: '#FFCB05' }}>
              {trainer.stats.longestStreak}×
            </div>
            <div className={s.trainerStatLabel}>Streak</div>
          </div>
          <div className={s.trainerStat}>
            <div className={s.trainerStatValue} style={{ color: '#9070B8' }}>
              {trainer.deepestFloor}
            </div>
            <div className={s.trainerStatLabel}>Best Floor</div>
          </div>
        </div>
      </div>
    </div>
  );
}
