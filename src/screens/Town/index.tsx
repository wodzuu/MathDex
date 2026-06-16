/**
 * Town hub — an illustrated map of Pallet Town with clickable areas.
 *
 * Areas (transparent hotspots over the artwork):
 *   Forest path    → generate encounters, enter the dungeon (/dungeon)
 *   Pokémon Center → heal the whole party, then open party / PC Box (/pc)
 *   Poké Mart      → buy Potions and Balls (/mart)
 *   Oak's Lab      → identify items (/identify) — only once the item system unlocks
 *
 * The header and party listing of the old hub are gone: the map is the view.
 * Build info + project link sit under the map; the Trainer Card is pinned to
 * the bottom of the screen.
 *
 * The map artwork lives at public/town-map.png (portrait ~9:16).
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore, useActiveTrainer, isItemSystemActive, getPartyHighestLevel } from '../../store/gameStore';
import { useDungeonStore } from '../../store/dungeonStore';
import { usePwaStore } from '../../store/pwaStore';

import s from './Town.module.css';

const MAP_URL = `${import.meta.env.BASE_URL}town-map.png`;

// Build timestamp injected by Vite (set by the GitHub Pages workflow). Formatted
// to "YYYY-MM-DD HH:mm UTC" for the footer.
const BUILD_TIME_LABEL = (() => {
  const d = new Date(__BUILD_TIME__);
  return isNaN(d.getTime()) ? __BUILD_TIME__ : `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
})();

export default function TownScreen() {
  const navigate = useNavigate();

  const trainer   = useActiveTrainer();
  const healParty = useGameStore((st) => st.healParty);
  const rollAll   = useDungeonStore((st) => st.rollAll);

  const needRefresh = usePwaStore((st) => st.needRefresh);
  const updateApp   = usePwaStore((st) => st.update);

  const itemActive = isItemSystemActive(trainer);

  // Forest → stock the dungeon and head in.
  const enterDungeon = useCallback(() => {
    rollAll(getPartyHighestLevel(trainer), itemActive);
    navigate('/dungeon');
  }, [trainer, itemActive, rollAll, navigate]);

  // Pokémon Center → full heal, then party / PC Box management.
  const enterCenter = useCallback(() => {
    healParty();
    navigate('/pc');
  }, [healParty, navigate]);

  return (
    <div className={s.screen}>

      {/* PWA update prompt */}
      {needRefresh && (
        <button className={s.updatePanel} onClick={updateApp}>
          <span className={s.updatePanelIcon}>⬆️</span>
          New version available. Tap to update
        </button>
      )}

      <div className={s.scroll}>
        {/* ── Illustrated map with hotspots ── */}
        <div className={s.mapWrap}>
          <img className={s.map} src={MAP_URL} alt="Pallet Town" />

          {/* Forest path → dungeon */}
          <button
            className={s.hotspot}
            style={{ top: '3%', left: '30%', width: '42%', height: '27%' }}
            onClick={enterDungeon}
            aria-label="Forest — enter the dungeon"
          >
            <span className={s.hotspotTag}>Forest →</span>
          </button>

          {/* Pokémon Center → heal + PC */}
          <button
            className={s.hotspot}
            style={{ top: '37%', left: '42%', width: '33%', height: '16%' }}
            onClick={enterCenter}
            aria-label="Pokémon Center — heal party and manage Pokémon"
          >
            <span className={s.hotspotTag}>Pokémon Center</span>
          </button>

          {/* Poké Mart → shop */}
          <button
            className={s.hotspot}
            style={{ top: '50%', left: '18%', width: '35%', height: '14%' }}
            onClick={() => navigate('/mart')}
            aria-label="Poké Mart — buy items"
          >
            <span className={s.hotspotTag}>Poké Mart</span>
          </button>

          {/* Oak's Lab → identify (hidden until the item system unlocks, spec §5.0) */}
          {itemActive && (
            <button
              className={s.hotspot}
              style={{ top: '67%', left: '20%', width: '60%', height: '20%' }}
              onClick={() => navigate('/identify')}
              aria-label="Oak's Lab — identify items"
            >
              <span className={s.hotspotTag}>Oak's Lab</span>
            </button>
          )}
        </div>

        {/* ── Build info + link (under the map) ── */}
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

      {/* ── Trainer Card (glued to the bottom) ── */}
      <div className={s.trainerCard}>
        <div className={s.mathRankRow}>
          <span className={s.mathRankLabel}>MATH RANK</span>
          <span className={s.mathRankValue}>{trainer.mathRank ?? 1}</span>
        </div>
        <div className={s.trainerStats}>
          <div className={s.trainerStat}>
            <div className={s.trainerStatValue} style={{ color: '#48c774' }}>{trainer.stats.totalProblemsSolved}</div>
            <div className={s.trainerStatLabel}>Correct</div>
          </div>
          <div className={s.trainerStat}>
            <div className={s.trainerStatValue} style={{ color: '#FFCB05' }}>{trainer.stats.longestStreak}×</div>
            <div className={s.trainerStatLabel}>Streak</div>
          </div>
          <div className={s.trainerStat}>
            <div className={s.trainerStatValue} style={{ color: '#9070B8' }}>{trainer.stats.totalCatches}</div>
            <div className={s.trainerStatLabel}>Caught</div>
          </div>
          <div className={s.trainerStat}>
            <div className={s.trainerStatValue} style={{ color: '#6890F0' }}>{trainer.stats.highestOpponentLevel ?? 0}</div>
            <div className={s.trainerStatLabel}>Top Lv</div>
          </div>
        </div>
      </div>
    </div>
  );
}
