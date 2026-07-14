/**
 * Shared party-member display card.
 *
 * Renders one party Pokémon with sprite, name/level, HP bar (numeric value),
 * EXP progress bar, and ATK/DEF/SPD stat chips. Used by both the Dungeon top
 * bar and the Town hub party strip so the two stay visually identical.
 *
 * All styling is inline (project convention) using tokens from styles/tokens.
 */

import { useEffect, useState } from 'react';
import { D, FONT_PIXEL, FONT_UI, typeColors } from '../styles/tokens';
import PokemonSprite from './ui/PokemonSprite';
import RarityBadge from './RarityBadge';
import type { PartyDisplayPokemon } from '../hooks/usePartyDisplay';

function hpColor(pct: number): string {
  if (pct > 50) return '#48c774';
  if (pct > 20) return '#FFCB05';
  return '#CC0000';
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,.3)', border: `1px solid ${D.border}`, borderRadius: 6, padding: '2px 6px' }}>
      <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.white }}>{value}</span>
      <span style={{ fontFamily: FONT_UI, fontSize: 9, color: D.muted, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

interface PartyMemberCardProps {
  pk: PartyDisplayPokemon;
  /** Marks this card as the lead/active fighter — shows the LEAD tag. */
  isLead?: boolean;
  /** When the card is the lead, also draw the yellow frame (Dungeon only). */
  frameLead?: boolean;
  /** Makes the card tappable (e.g. to choose the active fighter). */
  onClick?: () => void;
  /** Makes the sprite avatar tappable (e.g. to open the Pokédex detail). */
  onAvatarClick?: () => void;
  /** Sweep the HP bar up from empty on mount — the "just healed!" moment. */
  animateHp?: boolean;
}

export default function PartyMemberCard({ pk, isLead = false, frameLead = false, onClick, onAvatarClick, animateHp = false }: PartyMemberCardProps) {
  const spriteSz   = isLead ? 72 : 64;
  const showFrame  = frameLead && isLead;
  const tc         = typeColors(pk.type);

  // Heal sweep: start the HP bar empty and let the width transition fill it.
  const [hpSettled, setHpSettled] = useState(!animateHp);
  useEffect(() => {
    if (!animateHp) return;
    const t = setTimeout(() => setHpSettled(true), 180);
    return () => clearTimeout(t);
  }, [animateHp]);
  const shownHpPct = hpSettled ? pk.hpPct : 0;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', gap: 10, alignItems: 'center',
        padding: '8px 10px', borderRadius: 12,
        background: showFrame ? 'rgba(255,203,5,.06)' : 'transparent',
        border: `1px solid ${showFrame ? '#4a3000' : 'transparent'}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background .15s, border-color .15s',
      }}
    >
      {/* Sprite — tappable to open the Pokédex detail when enabled. */}
      <PokemonSprite
        dex={pk.dexNumber}
        alt={pk.name}
        onClick={onAvatarClick ? (e) => { e.stopPropagation(); onAvatarClick(); } : undefined}
        style={{ width: spriteSz, height: spriteSz, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.7))', cursor: onAvatarClick ? 'pointer' : 'inherit' }}
      />

      {/* Info column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + level + type */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT_UI, fontSize: 13, fontWeight: 800, color: D.white }}>{pk.name}</span>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted }}>Lv{pk.level}</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 800, fontSize: 9, padding: '1px 7px', borderRadius: 99, textTransform: 'uppercase', background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}` }}>
            {pk.type}
          </span>
          <RarityBadge rarity={pk.rarity} />
        </div>

        {/* HP bar with numeric value */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 6, color: D.white, minWidth: 12 }}>HP</span>
          <div style={{ flex: 1, height: 6, background: '#111', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${shownHpPct}%`, height: '100%', background: hpColor(pk.hpPct), transition: animateHp ? 'width .7s ease-out' : 'width .4s' }} />
          </div>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 6, color: hpColor(pk.hpPct), minWidth: 46, textAlign: 'right' }}>
            {pk.currentHp}/{pk.maxHp}
          </span>
        </div>

        {/* EXP bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 6, color: D.blue, minWidth: 12 }}>XP</span>
          <div style={{ flex: 1, height: 3, background: '#111', border: '1px solid rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${pk.expBarPct}%`, height: '100%', background: D.blue, transition: 'width .4s' }} />
          </div>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 6, color: D.muted, minWidth: 46, textAlign: 'right' }}>
            {pk.expToNext > 0 ? `-${pk.expToNext}` : 'MAX'}
          </span>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 5 }}>
          <StatChip label="Atk" value={pk.attack} />
          <StatChip label="Def" value={pk.defense} />
          <StatChip label="Spd" value={pk.speed} />
        </div>
      </div>
    </div>
  );
}
