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
import { getIdleSpriteUrl } from '../../lib/sprites';

import s from './Pokedex.module.css';

// Pokédex device frame: the header caps the top, the footer caps the bottom,
// and the 1px body cross-section (red rails + grey screen) stretches to fill
// the middle. Layered so the caps paint over the stretched screen.
const FRAME_HEADER = `${import.meta.env.BASE_URL}pokedex_header.png`;
const FRAME_BODY   = `${import.meta.env.BASE_URL}pokedex_body.png`;
const FRAME_FOOTER = `${import.meta.env.BASE_URL}pokedex_footer.png`;

const FRAME_STYLE = {
  backgroundImage:    `url(${FRAME_HEADER}), url(${FRAME_FOOTER}), url(${FRAME_BODY})`,
  backgroundRepeat:   'no-repeat, no-repeat, no-repeat',
  backgroundPosition: 'top center, bottom center, center',
  backgroundSize:     '100% auto, 100% auto, 100% 100%',
};

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
        ? <img className={s.sprite} src={getIdleSpriteUrl(sp.dexNumber)} alt={sp.name} />
        : <span className={s.q}>?</span>}
    </div>
  );
}

function Chip({ sp, caught }: { sp: PokemonSpecies; caught: boolean }) {
  return (
    <div className={s.chip}>
      <Disc sp={sp} caught={caught} />
      <div className={s.nm} style={{ color: caught ? NAME_CAUGHT : NAME_UNSEEN }}>{sp.name}</div>
    </div>
  );
}

// A branch form rendered as a compact horizontal chip in the fork column.
function MiniChip({ sp, caught }: { sp: PokemonSpecies; caught: boolean }) {
  return (
    <div className={s.mini}>
      <div className={`${s.miniDisc} ${caught ? s.discOn : ''}`}>
        {caught
          ? <img className={s.miniSprite} src={getIdleSpriteUrl(sp.dexNumber)} alt={sp.name} />
          : <span className={s.miniQ}>?</span>}
      </div>
      <div className={s.nm} style={{ color: caught ? NAME_CAUGHT : NAME_UNSEEN }}>{sp.name}</div>
    </div>
  );
}

export default function PokedexScreen() {
  const navigate = useNavigate();
  const trainer  = useActiveTrainer();
  const [tab, setTab] = useState<'evolutions' | 'list'>('evolutions');

  const families = useMemo(buildFamilies, []);
  const caught = useMemo(
    () => new Set(trainer.caughtPokemon.map((p) => p.speciesId)),
    [trainer.caughtPokemon],
  );
  const total = GEN1_SPECIES.length;

  return (
    <div className={s.screen}>
      <div className={s.frame} style={FRAME_STYLE} aria-hidden="true" />
      <div className={s.content}>
        <div className={s.header}>
          <button className={s.back} onClick={() => navigate(-1)}>← Back</button>
          <span className={s.title}>Pokédex</span>
          <span className={s.count}>{caught.size} / {total}</span>
        </div>
        <div className={s.tabs} role="tablist">
          <button className={`${s.tab} ${tab === 'evolutions' ? s.tabOn : ''}`} role="tab" aria-selected={tab === 'evolutions'} onClick={() => setTab('evolutions')}>Evolutions</button>
          <button className={`${s.tab} ${tab === 'list' ? s.tabOn : ''}`} role="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')}>Pokémon list</button>
        </div>

      <div className={s.body}>
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
                      <Chip sp={sp} caught={caught.has(sp.id)} />
                    </Fragment>
                  ))}
                  {branch && (
                    <>
                      <div className={s.step}>
                        <span className={s.lv}>Lv{evolutionsOf(branch.sp)[0]?.atLevel}</span>
                        <svg className={s.fork} width="26" height="120" viewBox="0 0 26 120" aria-hidden="true">
                          <path d="M2 60 H10 M10 60 C18 60 18 22 24 22 M10 60 C18 60 18 60 24 60 M10 60 C18 60 18 98 24 98" fill="none" stroke="#3a3f5e" strokeWidth="2" />
                        </svg>
                      </div>
                      <div className={s.branchCol}>
                        {branch.children.map((leaf) => (
                          <MiniChip key={leaf.sp.id} sp={leaf.sp} caught={caught.has(leaf.sp.id)} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <div className={s.placeholder}>
            <div className={s.placeholderIcon}>📋</div>
            <div className={s.placeholderTitle}>Pokémon list</div>
            <div className={s.placeholderSub}>Coming soon</div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
