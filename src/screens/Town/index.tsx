/**
 * Town hub — a forest backdrop (public/town.jpg) split into two zones:
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

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore, useActiveTrainer, isItemSystemActive, getPartyHighestLevel, getPartyPokemon } from '../../store/gameStore';
import { useDungeonStore } from '../../store/dungeonStore';
import { usePwaStore } from '../../store/pwaStore';

import { getSpecies, SPECIES_MAP } from '../../data/species';
import { MATH_WINDOW_SIZE, MATH_RANKUP_THRESHOLD, MAX_MATH_RANK, clampMathRank } from '../../data/curriculum';
import { calcHp, levelFromExp, totalPotions, totalBalls } from '../../lib/formulas';
import PokemonSprite from '../../components/ui/PokemonSprite';
import { asset } from '../../lib/assets';
import s from './Town.module.css';

// Grass spots (in % of the map) where party Pokémon hang out — the free band
// between the forest treeline and the building panels.
const SCENE_SPOTS = [
  { left: 13, top: 36 },
  { left: 81, top: 35 },
  { left: 32, top: 40 },
  { left: 63, top: 40 },
];

const TOWN_URL    = asset('town.jpg');
const TRAINER_IMG = asset('trainer.png');

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

  // Status strip + town scene: party at a glance (sprite + HP dot) and the
  // wallet, so the player can tell from the hub whether to heal or shop.
  const partyGlance = getPartyPokemon(trainer).map((pk) => {
    const spec  = getSpecies(pk.speciesId);
    const maxHp = spec ? calcHp(spec.baseStats.hp, levelFromExp(pk.totalExp)) : 1;
    const pct   = maxHp > 0 ? (pk.currentHp / maxHp) * 100 : 0;
    return {
      id:        pk.instanceId,
      speciesId: pk.speciesId,
      dex:       spec?.dexNumber ?? 0,
      pct,
      col: pct <= 0 ? '#555b70' : pct > 50 ? '#48c774' : pct > 20 ? '#F8D030' : '#CC0000',
    };
  });

  // Where each party member stands on the grass — jittered once per visit so
  // the scene looks a little different every time you come home.
  const sceneSpots = useMemo(
    () => SCENE_SPOTS.map((spot) => ({
      left: spot.left + (Math.random() * 6 - 3),
      top:  spot.top  + (Math.random() * 3 - 1.5),
    })),
    [],
  );

  // Petting: tapping a party Pokémon pops a little ❤ over it.
  const [hearts, setHearts] = useState<{ id: number; left: number; top: number }[]>([]);
  const petPokemon = (left: number, top: number) => {
    const id = Date.now() + Math.random();
    setHearts((h) => [...h, { id, left, top }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 950);
  };

  // ── Live dashboard lines for the building tiles ──────────────────────────────
  const hurtCount   = partyGlance.filter((p) => p.pct < 100).length;
  const ballCount   = totalBalls(trainer.pokeballs);
  const potionCount = totalPotions(trainer.potions);
  const lowBalls    = ballCount <= 1;
  const lowPotions  = potionCount <= 1;
  const martSub = lowBalls && lowPotions ? '⚠ Low on Balls & Potions!'
                : lowBalls   ? '⚠ Low on Poké Balls!'
                : lowPotions ? '⚠ Low on Potions!'
                : 'Potions & Balls';
  const dexCaught = new Set(trainer.caughtPokemon.map((p) => p.speciesId)).size;
  const dexTotal  = SPECIES_MAP.size;
  const mathRank  = clampMathRank(trainer.mathRank ?? 1);
  const rankCorrect = (trainer.mathWindow ?? []).filter(Boolean).length;
  const rankTarget  = Math.round(MATH_WINDOW_SIZE * MATH_RANKUP_THRESHOLD);

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

          {/* ── Ambient motion: cloud shadows, a falling leaf, twinkles ── */}
          <div className={s.cloud} style={{ top: '30%', animationDelay: '0s' }} aria-hidden />
          <div className={s.cloud} style={{ top: '58%', width: 120, animationDelay: '-26s' }} aria-hidden />
          <span className={s.leaf} aria-hidden>🍂</span>
          <span className={s.sparkle} style={{ left: '84%', top: '88%' }} aria-hidden>✨</span>
          <span className={s.sparkle} style={{ left: '8%', top: '52%', animationDelay: '1.2s' }} aria-hidden>✨</span>

          {/* ── The party hanging out on the grass — tap one to pet it (❤) ── */}
          {partyGlance.map((p, i) => {
            const spot = sceneSpots[i % sceneSpots.length];
            return (
              <button
                key={p.id}
                className={s.sceneMon}
                style={{ left: `${spot.left}%`, top: `${spot.top}%`, animationDelay: `${i * 0.45}s` }}
                onClick={() => petPokemon(spot.left, spot.top)}
                aria-label="Party Pokémon — pet it"
              >
                <PokemonSprite dex={p.dex} style={{ opacity: p.pct <= 0 ? 0.45 : 1 }} />
              </button>
            );
          })}

          {/* Hearts popping over petted Pokémon */}
          {hearts.map((h) => (
            <span key={h.id} className={s.heart} style={{ left: `${h.left}%`, top: `${h.top}%` }} aria-hidden>❤</span>
          ))}

          {/* ── Status strip: wallet + party at a glance ── */}
          <div className={s.statusStrip}>
            <button className={s.statusChip} onClick={() => navigate('/mart')} aria-label="Pokédollars — open the Mart">
              ₽{trainer.pokeDollars.toLocaleString()}
            </button>
            <button className={s.statusParty} onClick={() => navigate('/pc')} aria-label="Party — open the Pokémon Center">
              {partyGlance.map((p) => (
                <span key={p.id} className={s.statusMon}>
                  <PokemonSprite dex={p.dex} />
                  <span className={s.statusHpDot} style={{ background: p.col }} />
                </span>
              ))}
            </button>
          </div>

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
            {/* Tiles double as a live dashboard: each sub-line reflects the
                current state so town answers "what should I do next?". */}
            <button className={s.locTile} onClick={enterCenter}>
              <span className={s.locIcon}>🏥</span>
              <span className={s.locText}>
                <span className={s.locName}>Pokémon Center</span>
                {hurtCount > 0
                  ? <span className={s.locSub} style={{ color: '#e0574f' }}>{hurtCount === 1 ? '1 Pokémon needs healing!' : `${hurtCount} Pokémon need healing!`}</span>
                  : <span className={s.locSub} style={{ color: '#48c774' }}>❤ Everyone healthy!</span>}
              </span>
            </button>

            <button className={s.locTile} onClick={() => navigate('/mart')}>
              <span className={s.locIcon}>🛒</span>
              <span className={s.locText}>
                <span className={s.locName}>Poké Mart</span>
                <span className={s.locSub} style={{ color: lowBalls || lowPotions ? '#f0a030' : '#6890F0' }}>{martSub}</span>
              </span>
            </button>

            <button className={s.locTile} onClick={() => navigate('/pokedex')}>
              <span className={s.locIcon}>📕</span>
              <span className={s.locText}>
                <span className={s.locName}>Pokédex</span>
                <span className={s.locSub} style={{ color: '#e0574f' }}>{dexCaught} / {dexTotal} caught</span>
                <span className={s.dexBar}><span className={s.dexFill} style={{ width: `${Math.min(100, (dexCaught / dexTotal) * 100)}%` }} /></span>
              </span>
            </button>
            {/* Oak's Lab (identify items) is hidden until that feature is built. */}

            {/* ── Trainer panel — same style as the others; tap for details ── */}
            <button className={s.locTile} onClick={() => navigate('/trainer')}>
              <img className={s.locImg} src={TRAINER_IMG} alt="" />
              <span className={s.locText}>
                <span className={s.locName}>{trainer.name}</span>
                {mathRank >= MAX_MATH_RANK
                  ? <span className={s.locSub} style={{ color: '#FFCB05' }}>Math Rank {mathRank} · ★ Top rank!</span>
                  : <span className={s.locSub} style={{ color: '#FFCB05' }}>Math Rank {mathRank} · {rankCorrect}/{rankTarget} to rank up</span>}
              </span>
            </button>
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
