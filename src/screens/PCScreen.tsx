/**
 * PC Terminal — party management and PC Box.
 *
 * Party Pokémon: shown with full HP bar, level, type. Can be deposited to the
 * PC Box (min 1 Pokémon must remain in the party).
 *
 * PC Box: unlimited capacity. Pokémon here earn no EXP. Can be withdrawn to
 * the party when a slot is available (party < maxPartySize).
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore, useActiveTrainer, getPartyPokemon, getPcBoxPokemon }  from '../store/gameStore';
import { getSpecies }    from '../data/species';
import { calcHp, levelFromExp, expToLevel } from '../lib/formulas';
import { D, FONT_PIXEL, FONT_UI, typeColors } from '../styles/tokens';
import { getIdleSpriteUrl } from '../lib/sprites';
import type { OwnedPokemon } from '../types/gameState';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hpColor(pct: number) {
  if (pct > 50) return '#48c774';
  if (pct > 20) return '#FFCB05';
  return '#CC0000';
}

function hpPercent(speciesId: string, currentHp: number, level: number): number {
  const species = getSpecies(speciesId);
  if (!species) return 100;
  const maxHp = calcHp(species.baseStats.hp, level);
  return Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface PokemonRowProps {
  pk:          OwnedPokemon;
  showHp:      boolean;
  actionLabel: string;
  actionColor: string;
  actionBg:    string;
  disabled:    boolean;
  disabledHint?: string;
  onAction:    () => void;
}

function PokemonRow({ pk, showHp, actionLabel, actionColor, actionBg, disabled, disabledHint, onAction }: PokemonRowProps) {
  const species = getSpecies(pk.speciesId);
  if (!species) return null;

  const level      = levelFromExp(pk.totalExp);
  const tc         = typeColors(species.types[0]);
  const hpPct      = hpPercent(pk.speciesId, pk.currentHp, level);
  const expRange   = expToLevel(level + 1) - expToLevel(level);
  const expProgress = pk.totalExp - expToLevel(level);
  const expBarPct  = expRange > 0 ? Math.min(100, Math.max(0, Math.round((expProgress / expRange) * 100))) : 0;
  const expToNext  = Math.max(0, expToLevel(level + 1) - pk.totalExp);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: `1px solid ${D.border}` }}>
      {/* Sprite */}
      <div style={{ width: 48, height: 48, borderRadius: 12, background: tc.bg, border: `2px solid ${tc.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <img src={getIdleSpriteUrl(species.dexNumber)} alt={species.name} style={{ width: 40, height: 40, imageRendering: 'pixelated', objectFit: 'contain' }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: D.white }}>{species.name}</span>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>Lv{level}</span>
          <span style={{ display: 'inline-block', fontFamily: FONT_UI, fontWeight: 800, fontSize: 9, padding: '1px 7px', borderRadius: 99, textTransform: 'uppercase', background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}` }}>
            {species.types[0]}
          </span>
        </div>
        {showHp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.white, minWidth: 14 }}>HP</span>
            <div style={{ flex: 1, height: 6, background: '#111', border: '1px solid #ffffff20', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${hpPct}%`, height: '100%', background: hpColor(hpPct), borderRadius: 3, transition: 'width .4s' }} />
            </div>
            <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted }}>{hpPct}%</span>
          </div>
        )}
        {/* EXP bar — always shown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.blue, minWidth: 14 }}>EXP</span>
          <div style={{ flex: 1, height: 4, background: '#111', border: '1px solid #ffffff15', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${expBarPct}%`, height: '100%', background: D.blue, borderRadius: 2, transition: 'width .4s' }} />
          </div>
          <span style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: D.muted, minWidth: 44, textAlign: 'right' }}>
            {expToNext > 0 ? `-${expToNext}` : 'MAX'}
          </span>
        </div>
        {!showHp && (
          <span style={{ fontSize: 11, color: D.muted, fontWeight: 700, marginTop: 2 }}>In PC Box · No EXP earned</span>
        )}
        {disabled && disabledHint && (
          <div style={{ fontSize: 10, color: D.muted, marginTop: 3, fontWeight: 700 }}>{disabledHint}</div>
        )}
      </div>

      {/* Action button */}
      <button onClick={onAction} disabled={disabled} style={{
        padding: '8px 12px', fontFamily: FONT_UI, fontSize: 12, fontWeight: 800,
        background: disabled ? D.card2 : actionBg, color: disabled ? D.muted : actionColor,
        border: `2px solid ${disabled ? D.border : actionColor}`, borderRadius: 10,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        flexShrink: 0, transition: 'all .15s', whiteSpace: 'nowrap',
      }}>
        {actionLabel}
      </button>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PCScreen() {
  const navigate = useNavigate();

  const trainer = useActiveTrainer();
  const depositPokemon  = useGameStore(s => s.depositPokemon);
  const withdrawPokemon = useGameStore(s => s.withdrawPokemon);

  const party      = getPartyPokemon(trainer);
  const pcBox      = getPcBoxPokemon(trainer);
  const maxPartySize = trainer.maxPartySize;

  const handleDeposit  = useCallback((instanceId: string) => depositPokemon(instanceId),  [depositPokemon]);
  const handleWithdraw = useCallback((instanceId: string) => withdrawPokemon(instanceId), [withdrawPokemon]);

  const partyFull   = party.length >= maxPartySize;
  const partyAlone  = party.length <= 1;

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
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>{party.length} / {maxPartySize}</div>
        </div>
      </div>

      <div style={{ background: D.card, border: `2px solid ${D.border}`, borderRadius: 16, margin: '0 14px 14px', overflow: 'hidden' }}>
        {party.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: D.muted, fontSize: 13, fontWeight: 700 }}>No Pokémon in party</div>
        ) : (
          party.map((pk) => (
            <PokemonRow
              key={pk.instanceId}
              pk={pk}
              showHp
              actionLabel="DEPOSIT"
              actionColor={D.muted}
              actionBg={D.card2}
              disabled={partyAlone}
              disabledHint={partyAlone ? 'Need at least 1 in party' : undefined}
              onAction={() => handleDeposit(pk.instanceId)}
            />
          ))
        )}

        {/* Empty slots */}
        {Array.from({ length: maxPartySize - party.length }).map((_, i) => (
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
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>{pcBox.length} Pokémon</div>
        </div>
      </div>

      <div style={{ background: D.card, border: `2px solid ${D.border}`, borderRadius: 16, margin: '0 14px 80px', overflow: 'hidden' }}>
        {pcBox.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
            <div style={{ color: D.muted, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>PC Box is empty</div>
            <div style={{ color: D.muted, fontSize: 11, fontWeight: 600, lineHeight: 1.5 }}>
              Pokémon caught when your party is full will be stored here automatically.
            </div>
          </div>
        ) : (
          pcBox.map((pk) => (
            <PokemonRow
              key={pk.instanceId}
              pk={pk}
              showHp={false}
              actionLabel="WITHDRAW"
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
