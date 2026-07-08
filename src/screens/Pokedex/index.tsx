/**
 * Pokédex — the Gen 1 roster, reached from Town.
 *
 * Two tabs:
 *   Evolutions   — one horizontal row per evolution family (base → … → final).
 *   Pokémon list — a flat browseable list (designed later; placeholder for now).
 *
 * A species is shown in full (sprite + name) once it has been caught; otherwise
 * it appears as a dashed "?" silhouette so the dex doubles as a collection
 * tracker. Most families are a single left-to-right line; a branching family
 * (Eevee) forks to all of its possible forms.
 */

import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GEN1_SPECIES } from '../../data/gen1';
import { getSpecies } from '../../data/species';
import type { PokemonSpecies } from '../../types/pokemon';
import { evolutionsOf } from '../../lib/evolution';
import { useActiveTrainer } from '../../store/gameStore';
import { getIdleSpriteUrl, getSpriteUrl } from '../../lib/sprites';
import { asset } from '../../lib/assets';

import s from './Pokedex.module.css';

// Pokédex device frame: the header caps the top, the footer caps the bottom,
// and the 1px body cross-section (red rails + grey screen) stretches to fill
// the middle. Layered so the caps paint over the stretched screen.
const FRAME_HEADER = asset('pokedex_header.png');
const FRAME_BODY   = asset('pokedex_body.png');
const FRAME_FOOTER = asset('pokedex_footer.png');

// Each section paints the body cross-section (red rails + grey screen) as its
// base so the rails stay continuous; the top/footer add their bezel cap on top.
const TOP_BG = {
  backgroundImage:    `url(${FRAME_HEADER}), url(${FRAME_BODY})`,
  backgroundRepeat:   'no-repeat, no-repeat',
  backgroundPosition: 'top center, center',
  backgroundSize:     '100% auto, 100% 100%',
};
const SCROLL_BG = {
  backgroundImage:    `url(${FRAME_BODY})`,
  backgroundRepeat:   'no-repeat',
  backgroundPosition: 'center',
  backgroundSize:     '100% 100%',
};
const FOOTER_BG = {
  backgroundImage:    `url(${FRAME_FOOTER}), url(${FRAME_BODY})`,
  backgroundRepeat:   'no-repeat, no-repeat',
  backgroundPosition: 'bottom center, center',
  backgroundSize:     '100% auto, 100% 100%',
};

// Idle sprite with a fallback to the walk sprite — a couple of idle gifs are
// missing from the asset set (Beedrill, Dragonair), so avoid broken images.
function SpriteImg({ dex, name, className }: { dex: number; name: string; className: string }) {
  return (
    <img
      className={className}
      src={getIdleSpriteUrl(dex)}
      alt={name}
      loading="lazy"
      onError={(e) => {
        const im = e.currentTarget;
        if (im.dataset.fallback) return;
        im.dataset.fallback = '1';
        im.src = getSpriteUrl(dex);
      }}
    />
  );
}

interface Node { sp: PokemonSpecies; children: Node[]; }

// Build one tree per family: every family starts at the species nothing evolves
// into, then branches out through each `evolutionsOf` target.
function buildFamilies(): Node[] {
  const targets = new Set<string>();
  GEN1_SPECIES.forEach((sp) => evolutionsOf(sp).forEach((e) => targets.add(e.evolvesIntoId)));

  const build = (sp: PokemonSpecies, seen: Set<string>): Node => {
    seen.add(sp.id);
    const children = evolutionsOf(sp)
      .map((e) => getSpecies(e.evolvesIntoId))
      .filter((c): c is PokemonSpecies => !!c && !seen.has(c.id))
      .map((c) => build(c, seen));
    return { sp, children };
  };

  return GEN1_SPECIES
    .filter((sp) => !targets.has(sp.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((base) => build(base, new Set()));
}

// Flatten the single-child spine up to (and including) the branch point.
function spineOf(node: Node): { spine: PokemonSpecies[]; branch: Node | null } {
  const spine = [node.sp];
  let cur = node;
  while (cur.children.length === 1) { cur = cur.children[0]; spine.push(cur.sp); }
  return { spine, branch: cur.children.length > 1 ? cur : null };
}

const NAME_CAUGHT = '#12172b';
const NAME_UNSEEN = '#5c6280';

function Disc({ sp, caught }: { sp: PokemonSpecies; caught: boolean }) {
  return (
    <div className={`${s.disc} ${caught ? s.discOn : ''}`}>
      {caught
        ? <SpriteImg dex={sp.dexNumber} name={sp.name} className={s.sprite} />
        : <span className={s.q}>?</span>}
    </div>
  );
}

function Chip({ sp, caught, onPick }: { sp: PokemonSpecies; caught: boolean; onPick: (id: string) => void }) {
  return (
    <button type="button" className={s.chip} onClick={() => onPick(sp.id)}>
      <Disc sp={sp} caught={caught} />
      <div className={s.nm} style={{ color: caught ? NAME_CAUGHT : NAME_UNSEEN }}>{sp.name}</div>
    </button>
  );
}

// A branch form rendered as a compact horizontal chip in the fork column.
function MiniChip({ sp, caught, onPick }: { sp: PokemonSpecies; caught: boolean; onPick: (id: string) => void }) {
  return (
    <button type="button" className={s.mini} onClick={() => onPick(sp.id)}>
      <div className={`${s.miniDisc} ${caught ? s.discOn : ''}`}>
        {caught
          ? <SpriteImg dex={sp.dexNumber} name={sp.name} className={s.miniSprite} />
          : <span className={s.miniQ}>?</span>}
      </div>
      <div className={s.nm} style={{ color: caught ? NAME_CAUGHT : NAME_UNSEEN }}>{sp.name}</div>
    </button>
  );
}

export default function PokedexScreen() {
  const navigate = useNavigate();
  const trainer  = useActiveTrainer();
  const [tab, setTab] = useState<'evolutions' | 'list'>('list');
  const [query, setQuery] = useState('');

  const families = useMemo(buildFamilies, []);
  const allByName = useMemo(() => [...GEN1_SPECIES].sort((a, b) => a.name.localeCompare(b.name)), []);
  // Name filter for the flat list (case-insensitive substring).
  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? allByName.filter((sp) => sp.name.toLowerCase().includes(q)) : allByName;
  }, [allByName, query]);
  const caught = useMemo(
    () => new Set(trainer.caughtPokemon.map((p) => p.speciesId)),
    [trainer.caughtPokemon],
  );
  const total = GEN1_SPECIES.length;
  const openDetail = (speciesId: string) => navigate(`/pokemon/${speciesId}`);

  return (
    <div className={s.screen}>
      <div className={s.deviceTop} style={TOP_BG}>
        <div className={s.header}>
          <button className={s.back} onClick={() => navigate(-1)}>← Back</button>
          <span className={s.title}>Pokédex</span>
          <span className={s.count}>{caught.size} / {total}</span>
        </div>
        <div className={s.tabs} role="tablist">
          <button className={`${s.tab} ${tab === 'list' ? s.tabOn : ''}`} role="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')}>Pokémon list</button>
          <button className={`${s.tab} ${tab === 'evolutions' ? s.tabOn : ''}`} role="tab" aria-selected={tab === 'evolutions'} onClick={() => setTab('evolutions')}>Evolutions</button>
        </div>
      </div>

      <div className={s.scroll} style={SCROLL_BG}>
        {tab === 'evolutions' ? (
          <>
            {families.map((node) => {
              const { spine, branch } = spineOf(node);
              return (
                <div key={node.sp.id} className={s.row}>
                  {spine.map((sp, i) => (
                    <Fragment key={sp.id}>
                      {i > 0 && (
                        <div className={s.step}>
                          <span className={s.lv}>Lv{evolutionsOf(spine[i - 1])[0]?.atLevel}</span>
                          <span className={s.arrow}>→</span>
                        </div>
                      )}
                      <Chip sp={sp} caught={caught.has(sp.id)} onPick={openDetail} />
                    </Fragment>
                  ))}
                  {branch && (
                    <>
                      <div className={s.step}>
                        <span className={s.lv}>Lv{evolutionsOf(branch.sp)[0]?.atLevel}</span>
                        <span className={s.arrow}>→</span>
                      </div>
                      <div className={s.branchCol}>
                        {branch.children.map((leaf) => (
                          <MiniChip key={leaf.sp.id} sp={leaf.sp} caught={caught.has(leaf.sp.id)} onPick={openDetail} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <>
            {/* Name filter — sticky so it stays reachable while scrolling. */}
            <div className={s.searchWrap}>
              <span className={s.searchIcon} aria-hidden>🔍</span>
              <input
                className={s.searchInput}
                type="search"
                value={query}
                placeholder="Search by name…"
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Filter Pokémon by name"
              />
              {query && (
                <button className={s.searchClear} onClick={() => setQuery('')} aria-label="Clear search">✕</button>
              )}
            </div>
            {listed.length === 0 ? (
              <div className={s.noMatch}>No Pokémon match “{query.trim()}”</div>
            ) : (
              <div className={s.grid}>
                {listed.map((sp) => (
                  <button type="button" key={sp.id} className={s.cell} onClick={() => openDetail(sp.id)}>
                    <div className={`${s.disc} ${s.discOn}`}>
                      <SpriteImg dex={sp.dexNumber} name={sp.name} className={s.sprite} />
                    </div>
                    <div className={s.cellName}>{sp.name}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className={s.deviceFooter} style={FOOTER_BG} aria-hidden="true" />
    </div>
  );
}
