/**
 * Shared party-member display card.
 *
 * Renders one party Pokémon with sprite, name/level, HP bar (numeric value),
 * EXP progress bar, and ATK/DEF/SPD stat chips. Used by both the Dungeon top
 * bar and the Town hub party strip so the two stay visually identical.
 *
 * All styling is inline (project convention) using tokens from styles/tokens.
 */

import { D, FONT_PIXEL, FONT_UI, typeColors } from '../styles/tokens';
import { getIdleSpriteUrl } from '../lib/sprites';
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
  /** Highlight the lead with a yellow frame (Dungeon only). */
  frameLead?: boolean;
  /** Makes the card tappable (e.g. to choose the active fighter). */
  onClick?: () => void;
}

export default function PartyMemberCard({ pk, frameLead = false, onClick }: PartyMemberCardProps) {
  const spriteSz   = pk.isLead ? 48 : 38;
  const showFrame  = frameLead && pk.isLead;
  const tc         = typeColors(pk.type);

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
      {/* Sprite */}
      <img
        src={getIdleSpriteUrl(pk.dexNumber)}
        alt={pk.name}
        style={{ width: spriteSz, height: spriteSz, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }}
      />

      {/* Info column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + level + LEAD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT_UI, fontSize: 13, fontWeight: 800, color: D.white }}>{pk.name}</span>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted }}>Lv{pk.level}</span>
          {pk.isLead && (
            <span style={{ fontFamily: FONT_PIXEL, fontSize: 6, color: D.darker, background: D.yellow, borderRadius: 4, padding: '2px 5px', letterSpacing: 0.5 }}>LEAD</span>
          )}
          <span style={{ fontFamily: FONT_UI, fontWeight: 800, fontSize: 9, padding: '1px 7px', borderRadius: 99, textTransform: 'uppercase', background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}` }}>
            {pk.type}
          </span>
        </div>

        {/* HP bar with numeric value */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 6, color: D.white, minWidth: 12 }}>HP</span>
          <div style={{ flex: 1, height: 6, background: '#111', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${pk.hpPct}%`, height: '100%', background: hpColor(pk.hpPct), transition: 'width .4s' }} />
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
