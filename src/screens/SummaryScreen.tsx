/**
 * Battle summary — a full-screen victory / capture splash shown as a transition
 * step between the Battle and the Dungeon. Reached after a win or a successful
 * catch; tapping anywhere continues back into the dungeon.
 *
 * The outcome details (who was defeated/caught, Pokédollars earned, per-Pokémon
 * EXP gains) arrive via router state — the same payload the old inline dungeon
 * banner used. Reloading here (no state) just bounces back to the dungeon.
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { getIdleSpriteUrl } from '../lib/sprites';
import { asset } from '../lib/assets';
import ScreenBackdrop from '../components/ui/ScreenBackdrop';
import { FONT_PIXEL, FONT_UI } from '../styles/tokens';

const WON_BG     = asset('won.jpg');
const CAUGHT_BG  = asset('caught.jpg');
const POKEBALL_BG = asset('pokeball_open_bg.png');
const VICTORY_IMG = asset('victory.png');
const FAINTED_IMG = asset('fainted.png');

interface ExpGainEntry {
  instanceId:   string;
  name:         string;
  dexNumber:    number;
  expAdded:     number;
  oldLevel:     number;
  newLevel:     number;
  evolvedToName?: string;
  evolvedToDex?:  number;
}

export default function SummaryScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  const state    = location.state as Record<string, unknown> | null;
  const outcome  = state?.battleOutcome as 'victory' | 'caught' | 'fainted' | undefined;
  const name     = (state?.name as string | undefined) ?? 'Pokémon';
  const dexNumber = state?.dexNumber as number | undefined;
  const expGains = (state?.expGains as ExpGainEntry[] | undefined) ?? [];
  const pokeReward = state?.pokeReward as number | undefined;

  const known = outcome === 'victory' || outcome === 'caught' || outcome === 'fainted';
  // A blackout returns the player to town; wins / catches go back to the dungeon.
  const nextPath = outcome === 'fainted' ? '/' : '/dungeon';

  // No outcome (e.g. a reload) — nothing to summarise; carry on to the dungeon.
  useEffect(() => {
    if (!known) navigate('/dungeon', { replace: true });
  }, [known, navigate]);

  const handleContinue = () =>
    navigate(nextPath, { state: outcome === 'fainted' ? { blackedOut: true } : { battleOutcome: outcome } });

  if (!known) return null;

  return (
    <div
      onClick={handleContinue}
      role="button"
      aria-label={outcome === 'fainted' ? 'Return to town' : 'Continue to the dungeon'}
      style={{
        position: 'relative', maxWidth: 420, margin: '0 auto', minHeight: '100dvh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 22px calc(40px + env(safe-area-inset-bottom))', boxSizing: 'border-box',
        fontFamily: FONT_UI, color: '#eafff0', cursor: 'pointer', overflow: 'hidden',
      }}
    >
      <ScreenBackdrop src={outcome === 'caught' ? CAUGHT_BG : WON_BG} objectPosition="center" />

      {/* Centered outcome text */}
      <div className="fade-up" style={{ position: 'relative', zIndex: 1, width: '100%', textAlign: 'center' }}>
        {outcome === 'caught' && dexNumber != null ? (
          // The caught Pokémon emerging from an open Poké Ball.
          <div style={{ position: 'relative', width: 188, height: 188, margin: '0 auto 14px', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }}>
            <img src={POKEBALL_BG} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            <img src={getIdleSpriteUrl(dexNumber)} alt={name}
              style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%, -50%)', width: 104, height: 104, imageRendering: 'pixelated', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(140,210,255,0.55))' }} />
          </div>
        ) : outcome === 'fainted' ? (
          <img src={FAINTED_IMG} alt="" aria-hidden
            style={{ width: 188, height: 188, objectFit: 'contain', margin: '0 auto 14px', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }} />
        ) : outcome === 'victory' ? (
          <img src={VICTORY_IMG} alt="" aria-hidden
            style={{ width: 'min(300px, 82vw)', height: 'auto', objectFit: 'contain', margin: '0 auto 14px', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }} />
        ) : (
          <div style={{ fontSize: 46, lineHeight: 1, marginBottom: 14, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }}>
            🎯
          </div>
        )}
        <div style={{ fontSize: 26, fontWeight: 900, textShadow: '0 3px 12px rgba(0,0,0,0.85)', textTransform: 'capitalize' }}>
          {outcome === 'victory' ? `${name} defeated!` : outcome === 'caught' ? `${name} caught!` : 'You blacked out!'}
        </div>

        {pokeReward != null && pokeReward > 0 && (
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 13, color: '#F8D030', marginTop: 12, textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
            +₽{pokeReward.toLocaleString()}
          </div>
        )}

        {expGains.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', marginTop: 20 }}>
            {expGains.map((g) => (
              <div key={g.instanceId}
                style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
                  background: 'rgba(6,18,10,0.55)', border: '1px solid rgba(120,200,120,0.45)', borderRadius: 12, padding: '8px 12px' }}>
                <img src={getIdleSpriteUrl(g.evolvedToDex ?? g.dexNumber)} alt={g.evolvedToName ?? g.name}
                  style={{ width: 52, height: 52, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#f0f4ff', textTransform: 'capitalize' }}>{g.evolvedToName ?? g.name}</span>
                <span style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: '#6890F0' }}>+{g.expAdded} EXP</span>
                {g.newLevel > g.oldLevel && (
                  <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#F8D030', background: '#1a1400', border: '1px solid #F8D030', borderRadius: 5, padding: '2px 6px' }}>LV{g.newLevel}!</span>
                )}
                {g.evolvedToName && (
                  <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#78C850', background: '#0a2008', border: '1px solid #78C850', borderRadius: 5, padding: '2px 6px', textTransform: 'capitalize' }}>🧬 → {g.evolvedToName}!</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Continue affordance, pinned near the bottom */}
      <div className="pulsing"
        style={{ position: 'absolute', bottom: 'calc(34px + env(safe-area-inset-bottom))', left: 0, right: 0, zIndex: 1, textAlign: 'center',
          fontFamily: FONT_PIXEL, fontSize: 9, color: '#cfe8d6', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
        {outcome === 'fainted' ? 'TAP TO RETURN TO TOWN' : 'TAP TO CONTINUE'}
      </div>
    </div>
  );
}
