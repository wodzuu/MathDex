/**
 * /reset — wipes the save back to a fresh new game and returns to Town.
 *
 * Creates a brand-new GameState, hydrates the store, persists it, then
 * navigates home. Shows a brief "Resetting…" message while it works.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore } from '../store/gameStore';
import { createNewGame } from '../lib/newGame';
import { saveGameState } from '../db/db';
import { D, FONT_PIXEL, FONT_UI } from '../styles/tokens';

export default function ResetScreen() {
  const navigate = useNavigate();
  const hydrateFromSave = useGameStore((s) => s.hydrateFromSave);
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;   // guard against StrictMode double-invoke
    doneRef.current = true;

    const fresh = createNewGame();
    hydrateFromSave(fresh);
    void saveGameState(fresh);
    // Replace history so Back doesn't return to /reset and wipe again.
    navigate('/', { replace: true });
  }, [hydrateFromSave, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.darker, fontFamily: FONT_UI, color: D.white }}>
      <span style={{ fontFamily: FONT_PIXEL, fontSize: 10, color: D.yellow }}>RESETTING GAME…</span>
    </div>
  );
}
