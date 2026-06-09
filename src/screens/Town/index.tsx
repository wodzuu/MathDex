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

import { useGameStore, useActiveTrainer, isItemSystemActive, getPartyHighestLevel } from '../../store/gameStore';
import { useDungeonStore } from '../../store/dungeonStore';
import { usePwaStore } from '../../store/pwaStore';
import { usePartyDisplay } from '../../hooks/usePartyDisplay';
import PartyMemberCard from '../../components/PartyMemberCard';

import s from './Town.module.css';

// Build timestamp injected by Vite (set by the GitHub Pages workflow). Formatted
// to "YYYY-MM-DD HH:mm UTC" for the Town footer.
const BUILD_TIME_LABEL = (() => {
  const d = new Date(__BUILD_TIME__);
  return isNaN(d.getTime()) ? __BUILD_TIME__ : `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
})();

// ── Component ─────────────────────────────────────────────────────────────────

export default function TownScreen() {
  const navigate = useNavigate();
  const [healFlash, setHealFlash] = useState(false);

  const trainer = useActiveTrainer();
  const healParty = useGameStore(s => s.healParty);
  const rollEncounter = useDungeonStore((s) => s.rollEncounter);

  // PWA update prompt — shown at the top when a new version is waiting.
  const needRefresh = usePwaStore((s) => s.needRefresh);
  const updateApp   = usePwaStore((s) => s.update);

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
    rollEncounter(getPartyHighestLevel(trainer), itemActive);
    navigate('/dungeon');
  }, [trainer, itemActive, rollEncounter, navigate]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={s.screen}>

      {/* ══ PWA UPDATE PANEL ══════════════════════════════════════════════ */}
      {needRefresh && (
        <button className={s.updatePanel} onClick={updateApp}>
          <span className={s.updatePanelIcon}>⬆️</span>
          New version available. Tap to update
        </button>
      )}

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

        {/* ══ PARTY STRIP (no outer frame) ══════════════════════════════════ */}
        <div style={{ margin: '12px 0 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className={s.partyCardLabel}>PARTY</div>
          {displayParty.map((pk) => (
            <PartyMemberCard key={pk.instanceId} pk={pk} />
          ))}
        </div>

        {/* ══ PHASE NOTICE — only once the item system unlocks ══════════════ */}
        {itemActive && (
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
                ? `${totalPotions} Potion${totalPotions !== 1 ? 's' : ''} ready · Endless battles`
                : 'No potions — heal first'}
            </div>
          </div>
          <div
            className={s.dungeonBadge}
            style={{ background: '#180818', color: '#9070B8', border: '1px solid #301030' }}
          >
            ENTER →
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
              {trainer.stats.totalCatches}
            </div>
            <div className={s.trainerStatLabel}>Caught</div>
          </div>
          <div className={s.trainerStat}>
            <div className={s.trainerStatValue} style={{ color: '#6890F0' }}>
              {trainer.stats.highestOpponentLevel ?? 0}
            </div>
            <div className={s.trainerStatLabel}>Top Lv</div>
          </div>
        </div>

        {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
        <div className={s.footer}>
          <div>Build {BUILD_TIME_LABEL}</div>
          <a
            className={s.footerLink}
            href="https://github.com/wodzuu/MathDex"
            target="_blank"
            rel="noopener noreferrer"
          >
            Project page, licenses and source code
          </a>
        </div>
      </div>
    </div>
  );
}
