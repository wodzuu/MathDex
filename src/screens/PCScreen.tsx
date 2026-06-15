/**
 * PC Terminal — party management and PC Box.
 *
 * Party Pokémon: can be deposited to the PC Box (min 1 must remain in party).
 * PC Box: unlimited capacity. Pokémon here can join the party when there's a
 * free slot (party < maxPartySize).
 *
 * Both lists render with the shared PartyMemberCard (same panel as Town).
 */

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore, useActiveTrainer, getPcBoxPokemon } from '../store/gameStore';
import { usePartyDisplay, type PartyDisplayPokemon } from '../hooks/usePartyDisplay';
import PartyMemberCard from '../components/PartyMemberCard';
import { D, FONT_PIXEL, FONT_UI } from '../styles/tokens';

// ── PC Box sorting ────────────────────────────────────────────────────────────

type SortKey = 'level' | 'maxHp' | 'attack' | 'defense' | 'speed';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'level',   label: 'Level'  },
  { key: 'maxHp',   label: 'Max HP' },
  { key: 'attack',  label: 'Atk'    },
  { key: 'defense', label: 'Def'    },
  { key: 'speed',   label: 'Spd'    },
];

// ── Row: shared party card + an action button ─────────────────────────────────

interface PCRowProps {
  pk:           PartyDisplayPokemon;
  actionLabel:  string;
  actionColor:  string;
  actionBg:     string;
  disabled:     boolean;
  disabledHint?: string;
  onAction:     () => void;
}

function PCRow({ pk, actionLabel, actionColor, actionBg, disabled, disabledHint, onAction }: PCRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderBottom: `1px solid ${D.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <PartyMemberCard pk={pk} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <button onClick={onAction} disabled={disabled} style={{
          padding: '8px 12px', fontFamily: FONT_UI, fontSize: 12, fontWeight: 800,
          background: disabled ? D.card2 : actionBg, color: disabled ? D.muted : actionColor,
          border: `2px solid ${disabled ? D.border : actionColor}`, borderRadius: 10,
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
          transition: 'all .15s', whiteSpace: 'nowrap',
        }}>
          {actionLabel}
        </button>
        {disabled && disabledHint && (
          <span style={{ fontSize: 9, color: D.muted, fontWeight: 700, textAlign: 'right', maxWidth: 90 }}>{disabledHint}</span>
        )}
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PCScreen() {
  const navigate = useNavigate();

  const trainer = useActiveTrainer();
  const depositPokemon  = useGameStore(s => s.depositPokemon);
  const withdrawPokemon = useGameStore(s => s.withdrawPokemon);

  const maxPartySize = trainer.maxPartySize;
  const boxIds       = getPcBoxPokemon(trainer).map(p => p.instanceId);

  // Display data via the shared hook. PC Terminal never marks a lead.
  const partyDisplay = usePartyDisplay(trainer.party, trainer.caughtPokemon);
  const boxDisplay   = usePartyDisplay(boxIds, trainer.caughtPokemon);

  const handleDeposit  = useCallback((instanceId: string) => depositPokemon(instanceId),  [depositPokemon]);
  const handleWithdraw = useCallback((instanceId: string) => withdrawPokemon(instanceId), [withdrawPokemon]);

  const partyFull  = partyDisplay.length >= maxPartySize;
  const partyAlone = partyDisplay.length <= 1;

  // PC Box sort — by level descending by default. Re-clicking a key flips direction.
  const [sortKey, setSortKey] = useState<SortKey>('level');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  }, [sortKey]);

  const sortedBox = useMemo(() => {
    const arr = [...boxDisplay];
    arr.sort((a, b) => (sortDir === 'asc' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
    return arr;
  }, [boxDisplay, sortKey, sortDir]);

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100vh', fontFamily: FONT_UI, color: D.white, background: D.darker }}>

      {/* Header */}
      <div style={{ padding: '16px 14px 12px', background: `linear-gradient(180deg,#0a1a3a,${D.navy})`, borderBottom: `2px solid ${D.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/')} style={{ background: D.card, border: `2px solid ${D.border}`, borderRadius: 10, padding: '6px 12px', color: D.muted, fontFamily: FONT_UI, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            ← Town
          </button>
          <div>
            <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.yellow, letterSpacing: 2, marginBottom: 4 }}>PC TERMINAL</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>Party &amp; PC Box</div>
          </div>
        </div>
      </div>

      {/* ── PARTY ── */}
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted, letterSpacing: 2 }}>PARTY</div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>{partyDisplay.length} / {maxPartySize}</div>
        </div>
      </div>

      <div style={{ background: D.card, border: `2px solid ${D.border}`, borderRadius: 16, margin: '0 14px 14px', overflow: 'hidden' }}>
        {partyDisplay.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: D.muted, fontSize: 13, fontWeight: 700 }}>No Pokémon in party</div>
        ) : (
          partyDisplay.map((pk) => (
            <PCRow
              key={pk.instanceId}
              pk={pk}
              actionLabel="Deposit"
              actionColor={D.muted}
              actionBg={D.card2}
              disabled={partyAlone}
              disabledHint={partyAlone ? 'Need 1 in party' : undefined}
              onAction={() => handleDeposit(pk.instanceId)}
            />
          ))
        )}

        {/* Empty slots */}
        {Array.from({ length: maxPartySize - partyDisplay.length }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: `1px solid ${D.border}`, opacity: 0.4 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: D.card2, border: `2px dashed ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>➕</div>
            <span style={{ fontSize: 13, color: D.muted, fontWeight: 700 }}>Empty slot</span>
          </div>
        ))}
      </div>

      {/* ── PC BOX ── */}
      <div style={{ padding: '0 14px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted, letterSpacing: 2 }}>PC BOX</div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>{boxDisplay.length} Pokémon</div>
        </div>

        {/* Sort toolbar — selected key shows a direction arrow + accent colour. */}
        {boxDisplay.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: FONT_UI, fontSize: 12, fontWeight: 800, color: D.muted }}>Sort by:</span>
            {SORT_OPTIONS.map((o) => {
              const selected = o.key === sortKey;
              return (
                <button
                  key={o.key}
                  onClick={() => handleSort(o.key)}
                  style={{
                    fontFamily: FONT_UI, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    padding: '5px 10px', borderRadius: 8, transition: 'all .15s',
                    background: selected ? '#1a1400' : 'transparent',
                    color: selected ? D.yellow : D.muted,
                    border: `1px solid ${selected ? D.yellow : 'transparent'}`,
                  }}
                >
                  {o.label}{selected ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: D.card, border: `2px solid ${D.border}`, borderRadius: 16, margin: '0 14px 80px', overflow: 'hidden' }}>
        {boxDisplay.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
            <div style={{ color: D.muted, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>PC Box is empty</div>
            <div style={{ color: D.muted, fontSize: 11, fontWeight: 600, lineHeight: 1.5 }}>
              Pokémon caught when your party is full will be stored here automatically.
            </div>
          </div>
        ) : (
          sortedBox.map((pk) => (
            <PCRow
              key={pk.instanceId}
              pk={pk}
              actionLabel="Join party"
              actionColor={D.green}
              actionBg="#0a1a0a"
              disabled={partyFull}
              disabledHint={partyFull ? `Party full (${maxPartySize}/${maxPartySize})` : undefined}
              onAction={() => handleWithdraw(pk.instanceId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
