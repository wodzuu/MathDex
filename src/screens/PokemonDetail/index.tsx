/**
 * Pokémon detail — a standalone (non-tab) view reached by tapping any Pokémon
 * image in the game. "Back" returns to wherever the player came from.
 *
 * Top to bottom: sprite + types + rarity + EXP yield, caught status, base stats,
 * the evolution line, type weaknesses/resistances, and the level-up moves.
 */

import { Fragment, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getSpecies } from '../../data/species';
import { getMove } from '../../data/moves';
import { useActiveTrainer } from '../../store/gameStore';
import { getIdleSpriteUrl, getSpriteUrl } from '../../lib/sprites';
import { asset } from '../../lib/assets';
import { levelFromExp } from '../../lib/formulas';
import { baseFormOf, evolutionTreeFrom, type EvoNode } from '../../lib/evolution';
import { getTypeMultiplier } from '../../lib/mathProblemGenerator';
import { typeColors, STAT_COLORS, STAT_MAX, RARITY_COLORS, TYPE_COLORS } from '../../styles/tokens';
import type { BaseStats, PokeType } from '../../types/pokemon';

import s from './PokemonDetail.module.css';

const FRAME_HEADER = asset('pokedex_header.png');
const FRAME_BODY   = asset('pokedex_body.png');
const FRAME_FOOTER = asset('pokedex_footer.png');

const TOP_BG    = { backgroundImage: `url(${FRAME_HEADER}), url(${FRAME_BODY})`, backgroundRepeat: 'no-repeat, no-repeat', backgroundPosition: 'top center, center', backgroundSize: '100% auto, 100% 100%' };
const SCROLL_BG = { backgroundImage: `url(${FRAME_BODY})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: '100% 100%' };
const FOOTER_BG = { backgroundImage: `url(${FRAME_FOOTER}), url(${FRAME_BODY})`, backgroundRepeat: 'no-repeat, no-repeat', backgroundPosition: 'bottom center, center', backgroundSize: '100% auto, 100% 100%' };

const STATS: { key: keyof BaseStats; label: string }[] = [
  { key: 'hp',      label: 'HP' },
  { key: 'attack',  label: 'ATK' },
  { key: 'defense', label: 'DEF' },
  { key: 'spAtk',   label: 'SP.ATK' },
  { key: 'spDef',   label: 'SP.DEF' },
  { key: 'speed',   label: 'SPEED' },
];

const ALL_TYPES = Object.keys(TYPE_COLORS) as PokeType[];

function SpriteImg({ dex, name, className }: { dex: number; name: string; className: string }) {
  return (
    <img
      className={className}
      src={getIdleSpriteUrl(dex)}
      alt={name}
      onError={(e) => {
        const im = e.currentTarget;
        if (im.dataset.fallback) return;
        im.dataset.fallback = '1';
        im.src = getSpriteUrl(dex);
      }}
    />
  );
}

function TypePill({ type, small }: { type: PokeType; small?: boolean }) {
  const tc = typeColors(type);
  return <span className={small ? s.typePillSm : s.typePill} style={{ background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}` }}>{type}</span>;
}

// Flatten the single-child spine up to (and including) a branch point.
function evoSpine(node: EvoNode): { spine: EvoNode[]; branch: EvoNode | null } {
  const spine = [node];
  let cur = node;
  while (cur.children.length === 1) { cur = cur.children[0]; spine.push(cur); }
  return { spine, branch: cur.children.length > 1 ? cur : null };
}

function EvoStage({ id, current, onPick }: { id: string; current: boolean; onPick: (id: string) => void }) {
  const sp = getSpecies(id);
  if (!sp) return null;
  return (
    <button type="button" className={`${s.evoStage} ${current ? s.evoCurrent : ''}`} onClick={() => onPick(id)}>
      <SpriteImg dex={sp.dexNumber} name={sp.name} className={s.evoSprite} />
      <span className={s.evoName}>{sp.name}</span>
    </button>
  );
}

export default function PokemonDetailScreen() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const trainer  = useActiveTrainer();

  const sp = id ? getSpecies(id) : undefined;
  // Switching Pokémon from the evolution chart REPLACES this entry rather than
  // pushing, so "Back" always returns to the view we entered from (e.g. the
  // Pokédex) instead of stepping back through each Pokémon we looked at.
  const openDetail = (sid: string) => navigate(`/pokemon/${sid}`, { replace: true });

  const ownedLevel = useMemo(() => {
    if (!sp) return null;
    const owned = trainer.caughtPokemon.filter((p) => p.speciesId === sp.id);
    return owned.length ? Math.max(...owned.map((p) => levelFromExp(p.totalExp))) : null;
  }, [sp, trainer.caughtPokemon]);

  const tree = useMemo(() => (sp ? evolutionTreeFrom(baseFormOf(sp.id)) : null), [sp]);

  const matchups = useMemo(() => {
    if (!sp) return { weak: [] as PokeType[], resist: [] as PokeType[], immune: [] as PokeType[] };
    const weak: PokeType[] = [], resist: PokeType[] = [], immune: PokeType[] = [];
    for (const atk of ALL_TYPES) {
      const mult = sp.types.reduce((m, t) => m * getTypeMultiplier(atk, t), 1);
      if (mult === 0) immune.push(atk);
      else if (mult > 1) weak.push(atk);
      else if (mult < 1) resist.push(atk);
    }
    return { weak, resist, immune };
  }, [sp]);

  const moves = useMemo(() => {
    if (!sp) return [];
    return [...sp.learnset]
      .sort((a, b) => a.level - b.level)
      .map((lm) => ({ level: lm.level, move: getMove(lm.moveId) }))
      .filter((m) => m.move);
  }, [sp]);

  if (!sp) {
    return (
      <div className={s.screen}>
        <div className={s.deviceTop} style={TOP_BG}>
          <div className={s.header}>
            <button className={s.back} onClick={() => navigate(-1)}>← Back</button>
            <span className={s.title}>Unknown</span><span className={s.count} />
          </div>
        </div>
        <div className={s.scroll} style={SCROLL_BG}><div className={s.caughtBox}>No data for this Pokémon.</div></div>
        <div className={s.deviceFooter} style={FOOTER_BG} aria-hidden="true" />
      </div>
    );
  }

  const rc = RARITY_COLORS[sp.rarity];
  const { spine, branch } = evoSpine(tree!);

  return (
    <div className={s.screen}>
      <div className={s.deviceTop} style={TOP_BG}>
        <div className={s.header}>
          <button className={s.back} onClick={() => navigate(-1)}>← Back</button>
          <span className={s.title}>{sp.name}</span>
          <span className={s.count}>#{String(sp.dexNumber).padStart(3, '0')}</span>
        </div>
      </div>

      <div className={s.scroll} style={SCROLL_BG}>
        {/* Hero: sprite, types, rarity + EXP yield */}
        <div className={s.hero}>
          <SpriteImg dex={sp.dexNumber} name={sp.name} className={s.heroSprite} />
          <div className={s.types}>{sp.types.map((t) => <TypePill key={t} type={t} />)}</div>
          <div className={s.meta}>
            <span className={s.rarityBadge} style={{ background: rc.bg, color: rc.fg, border: `1px solid ${rc.bdr}` }}>{sp.rarity}</span>
            <span className={s.expChip}>EXP yield <strong>{sp.baseExp}</strong></span>
          </div>
        </div>

        {/* Caught status — above the base stats */}
        <div className={s.caughtBox} style={{ color: ownedLevel != null ? '#1f7a44' : '#5c6280' }}>
          {ownedLevel != null
            ? <>✅ Caught — <strong style={{ color: '#12172b', marginLeft: 4 }}>Lv {ownedLevel}</strong></>
            : <>◻️ Not caught yet</>}
        </div>

        {/* Evolution line */}
        <div className={s.sectionLabel}>Evolution</div>
        <div className={s.evoBox}>
          {spine.length === 1 && !branch ? (
            <span className={s.evoNone}>Does not evolve</span>
          ) : (
            <div className={s.evoRow}>
              {spine.map((n, i) => (
                <Fragment key={n.id}>
                  {i > 0 && <span className={s.evoArrow}><span className={s.evoLv}>Lv{n.level}</span>→</span>}
                  <EvoStage id={n.id} current={n.id === sp.id} onPick={openDetail} />
                </Fragment>
              ))}
              {branch && (
                <>
                  <span className={s.evoArrow}><span className={s.evoLv}>Lv{branch.children[0].level}</span>→</span>
                  <div className={s.evoBranch}>
                    {branch.children.map((c) => <EvoStage key={c.id} id={c.id} current={c.id === sp.id} onPick={openDetail} />)}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Base stats */}
        <div className={s.sectionLabel}>Base stats</div>
        <div className={s.statsBox}>
          {STATS.map(({ key, label }) => {
            const val = sp.baseStats[key];
            const pct = Math.max(2, Math.min(100, Math.round((val / STAT_MAX[key]) * 100)));
            return (
              <div className={s.statRow} key={key}>
                <span className={s.statLabel}>{label}</span>
                <span className={s.statVal}>{val}</span>
                <div className={s.statTrack}><div className={s.statFill} style={{ width: `${pct}%`, background: STAT_COLORS[key] }} /></div>
              </div>
            );
          })}
        </div>

        {/* Type matchups */}
        <div className={s.sectionLabel}>Type matchups</div>
        <div className={s.matchups}>
          <div className={s.matchRow}>
            <span className={s.matchLabel}>Weak to</span>
            <span className={s.matchTypes}>{matchups.weak.length ? matchups.weak.map((t) => <TypePill key={t} type={t} small />) : <span className={s.matchNone}>None</span>}</span>
          </div>
          <div className={s.matchRow}>
            <span className={s.matchLabel}>Resists</span>
            <span className={s.matchTypes}>{matchups.resist.length ? matchups.resist.map((t) => <TypePill key={t} type={t} small />) : <span className={s.matchNone}>None</span>}</span>
          </div>
          {matchups.immune.length > 0 && (
            <div className={s.matchRow}>
              <span className={s.matchLabel}>Immune</span>
              <span className={s.matchTypes}>{matchups.immune.map((t) => <TypePill key={t} type={t} small />)}</span>
            </div>
          )}
        </div>

        {/* Moves */}
        <div className={s.sectionLabel}>Moves</div>
        <div className={s.movesBox}>
          {moves.map(({ level, move }, i) => (
            <div className={s.moveRow} key={`${move!.id}-${i}`}>
              <span className={s.moveLv}>Lv{level}</span>
              <span className={s.moveName}>{move!.name}</span>
              <TypePill type={move!.type} small />
              <span className={s.movePower}>{move!.power > 0 ? `${move!.power}` : '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={s.deviceFooter} style={FOOTER_BG} aria-hidden="true" />
    </div>
  );
}
