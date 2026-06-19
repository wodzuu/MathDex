/**
 * Town hub — a forest backdrop (public/forest.png) split into two zones:
 *
 *   Top (forest + path)  → tapping enters the dungeon (/dungeon).
 *   Grass (lower)        → building panels:
 *       Pokémon Center → heal the whole party, then party / PC Box (/pc)
 *       Poké Mart      → buy Potions and Balls (/mart)
 *       Oak's Lab      → identify items (/identify) — only once the item system unlocks
 *
 * Build info + project link sit under the backdrop; the Trainer Card is pinned
 * to the bottom of the screen.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore, useActiveTrainer, isItemSystemActive, getPartyHighestLevel } from '../../store/gameStore';
import { useDungeonStore } from '../../store/dungeonStore';
import { usePwaStore } from '../../store/pwaStore';

import s from './Town.module.css';

const TOWN_URL = `${import.meta.env.BASE_URL}town.png`;

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
        {/* ── Forest backdrop: forest = dungeon, grass = building panels ── */}
        <div className={s.mapWrap}>
          <img className={s.map} src={TOWN_URL} alt="Town" />

          {/* Top forest + path → enter the dungeon */}
          <button
            className={s.forestHotspot}
            onClick={enterDungeon}
            aria-label="Forest — enter the dungeon"
          >
            <span className={s.forestTag}>🌲 Enter the Forest →</span>
          </button>

          {/* Building panels, sitting on the grass */}
          <div className={s.grassPanels}>
            <button className={s.locTile} onClick={enterCenter}>
              <span className={s.locIcon}>🏥</span>
              <span className={s.locText}>
                <span className={s.locName}>Pokémon Center</span>
                <span className={s.locSub} style={{ color: '#48c774' }}>Heal · Party &amp; PC Box</span>
              </span>
            </button>

            <button className={s.locTile} onClick={() => navigate('/mart')}>
              <span className={s.locIcon}>🛒</span>
              <span className={s.locText}>
                <span className={s.locName}>Poké Mart</span>
                <span className={s.locSub} style={{ color: '#6890F0' }}>Potions &amp; Balls</span>
              </span>
            </button>
            {/* Oak's Lab (identify items) is hidden until that feature is built. */}
          </div>

          {/* ── Trainer Card — overlaid on the grass, below the panels ── */}
          <div className={s.trainerCard}>
            <div className={s.trainerStats}>
              <div className={s.trainerStat}>
                <div className={s.trainerStatValue} style={{ color: '#FFCB05' }}>{trainer.mathRank ?? 1}</div>
                <div className={s.trainerStatLabel}>Math Rank</div>
              </div>
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

        {/* ── Build info + link ── */}
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
