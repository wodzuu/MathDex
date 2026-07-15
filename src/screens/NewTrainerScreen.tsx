/**
 * New Trainer — first screen a brand-new player sees (no trainer yet), and also
 * reachable from the Trainer view to spin up an additional trainer.
 *
 * Pick a name and one of four starter Pokémon, then the adventure begins. If at
 * least one trainer already exists the screen offers a Cancel button; the very
 * first time there's no way out until a trainer is created.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore } from '../store/gameStore';
import { STARTER_IDS } from '../lib/newGame';
import { getSpecies } from '../data/species';
import PokemonSprite from '../components/ui/PokemonSprite';
import { D, FONT_PIXEL, FONT_UI, typeColors } from '../styles/tokens';

const MAX_NAME = 12;

export default function NewTrainerScreen() {
  const navigate      = useNavigate();
  const createTrainer = useGameStore((s) => s.createTrainer);
  const hasTrainers   = useGameStore((s) => s.trainers.length > 0);

  const [name, setName]       = useState('');
  const [starter, setStarter] = useState<string | null>(null);

  const trimmed = name.trim();
  const canStart = trimmed.length > 0 && starter !== null;

  const handleStart = () => {
    if (!canStart) return;
    createTrainer(trimmed, starter!);
    navigate('/', { replace: true });   // active trainer is now set → into Town
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100dvh', background: D.darker, fontFamily: FONT_UI, color: D.white, display: 'flex', flexDirection: 'column', padding: '0 0 calc(20px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div style={{ padding: 'calc(18px + env(safe-area-inset-top)) 16px 14px', background: `linear-gradient(180deg,#0a1a3a,${D.navy})`, borderBottom: `2px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        {hasTrainers && (
          <button onClick={() => navigate(-1)} style={{ background: D.card, border: `2px solid ${D.border}`, borderRadius: 10, padding: '6px 12px', color: D.muted, fontFamily: FONT_UI, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>← Cancel</button>
        )}
        <div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.yellow, letterSpacing: 2, marginBottom: 5 }}>NEW TRAINER</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Begin your adventure</div>
        </div>
      </div>

      <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Name */}
        <div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.muted, marginBottom: 10, letterSpacing: 1 }}>YOUR NAME</div>
          <input
            value={name}
            maxLength={MAX_NAME}
            placeholder="Enter a name…"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canStart) handleStart(); }}
            style={{ width: '100%', fontFamily: FONT_UI, fontSize: 18, fontWeight: 800, textAlign: 'center', background: D.card, color: D.white, border: `2px solid ${D.border2}`, borderRadius: 12, padding: '14px 12px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Starter selection */}
        <div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.muted, marginBottom: 10, letterSpacing: 1 }}>CHOOSE YOUR PARTNER</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {STARTER_IDS.map((id) => {
              const sp       = getSpecies(id);
              const selected = starter === id;
              const tc       = typeColors(sp?.types[0] ?? 'Normal');
              return (
                <button
                  key={id}
                  onClick={() => setStarter(id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    background: selected ? '#16240f' : D.card,
                    border: `2px solid ${selected ? D.green : D.border}`,
                    borderRadius: 14, padding: '14px 10px 12px', cursor: 'pointer',
                    boxShadow: selected ? `0 0 0 3px ${D.green}33` : 'none', transition: 'all .15s',
                  }}
                >
                  <PokemonSprite dex={sp?.dexNumber ?? 1} alt={sp?.name ?? id}
                    style={{ width: 72, height: 72, imageRendering: 'pixelated', objectFit: 'contain' }} />
                  <span style={{ fontSize: 15, fontWeight: 900, textTransform: 'capitalize' }}>{sp?.name ?? id}</span>
                  <span style={{ fontFamily: FONT_UI, fontWeight: 800, fontSize: 9, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}` }}>{sp?.types[0] ?? 'Normal'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start */}
        <button
          onClick={handleStart}
          disabled={!canStart}
          style={{
            marginTop: 4, padding: '15px', fontFamily: FONT_UI, fontSize: 16, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: 0.5,
            background: canStart ? D.yellow : D.border2, color: canStart ? D.darker : D.muted,
            border: '2px solid rgba(0,0,0,.15)', borderRadius: 14,
            cursor: canStart ? 'pointer' : 'not-allowed',
            boxShadow: canStart ? '0 4px 0 #a07800' : 'none',
          }}
        >
          Start adventure
        </button>
      </div>
    </div>
  );
}
