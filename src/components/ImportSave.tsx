/**
 * Import-save trigger — a button that opens a file picker, validates the chosen
 * file with decodeSave(), and confirms before replacing the whole save.
 *
 * Shared between the Trainer screen (restore over an existing save) and the
 * New Trainer screen (disaster recovery on a fresh device, where /trainer is
 * unreachable because TrainerGuard redirects). The consumer styles the trigger
 * via className/style; the modals style themselves from tokens.
 */

import { useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { useDungeonStore } from '../store/dungeonStore';
import { saveGameState } from '../db/db';
import { decodeSave } from '../lib/saveCodec';
import { D, FONT_UI } from '../styles/tokens';
import type { GameState } from '../types';

interface ImportSaveProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export default function ImportSave({ className, style, children }: ImportSaveProps) {
  const navigate = useNavigate();
  const hydrateFromSave = useGameStore((s) => s.hydrateFromSave);
  const inputRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';   // allow re-picking the same file after a cancel
    if (!file) return;
    try {
      setPending(decodeSave(await file.text()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That file could not be read.');
    }
  };

  const applyImport = () => {
    if (!pending) return;
    void saveGameState(pending);
    // Any in-flight battle/encounter references Pokémon from the old save.
    useBattleStore.getState().endBattle();
    useDungeonStore.getState().exitDungeon();
    hydrateFromSave(pending);
    setPending(null);
    navigate('/', { replace: true });
  };

  const trainerCount = pending?.trainers.length ?? 0;
  const pokemonCount = pending?.trainers.reduce((n, t) => n + t.caughtPokemon.length, 0) ?? 0;

  return (
    <>
      <button type="button" className={className} style={style} onClick={() => inputRef.current?.click()}>
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={(e) => void handleFile(e)}
      />

      {pending && (
        <div style={sx.overlay} role="dialog" aria-modal="true">
          <div style={{ ...sx.card, borderColor: D.green }}>
            <div style={sx.emoji}>📥</div>
            <div style={sx.title}>Import this save?</div>
            <div style={sx.text}>
              {trainerCount === 1
                ? <>Trainer <b style={sx.hi}>{pending.trainers[0].name}</b></>
                : <><b style={sx.hi}>{trainerCount}</b> trainers</>}
              {' '}with <b style={sx.hi}>{pokemonCount}</b> Pokémon.
              <br />
              This <b style={sx.warn}>replaces everything</b> currently in the game.
            </div>
            <div style={sx.row}>
              <button style={sx.btnGhost} onClick={() => setPending(null)}>Cancel</button>
              <button style={sx.btnGo} onClick={applyImport}>Import</button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={sx.overlay} role="dialog" aria-modal="true">
          <div style={{ ...sx.card, borderColor: D.red }}>
            <div style={sx.emoji}>⚠️</div>
            <div style={sx.title}>Import failed</div>
            <div style={sx.text}>{error}</div>
            <button style={{ ...sx.btnGhost, width: '100%' }} onClick={() => setError(null)}>OK</button>
          </div>
        </div>
      )}
    </>
  );
}

// Mirrors the delete-confirmation modal in TrainerDetail.module.css.
const sx: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 24, background: 'rgba(4, 6, 12, 0.78)',
  },
  card: {
    width: '100%', maxWidth: 340, background: '#161b30', border: `2px solid ${D.border}`,
    borderRadius: 16, padding: '20px 18px', textAlign: 'center',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)', fontFamily: FONT_UI, color: D.white,
  },
  emoji: { fontSize: 44, lineHeight: 1, marginBottom: 8 },
  title: { fontSize: 19, fontWeight: 900, marginBottom: 10 },
  text:  { fontSize: 13, lineHeight: 1.55, color: '#c7cfe8', marginBottom: 16 },
  hi:    { color: D.yellow },
  warn:  { color: '#f6a39b' },
  row:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  btnGhost: {
    padding: 12, borderRadius: 11, background: 'transparent', border: `2px solid ${D.border}`,
    color: '#aeb8d6', fontFamily: FONT_UI, fontSize: 14, fontWeight: 800, cursor: 'pointer',
  },
  btnGo: {
    padding: 12, borderRadius: 11, background: '#2f6e3a', border: `2px solid ${D.green}`,
    color: '#eafff0', fontFamily: FONT_UI, fontSize: 14, fontWeight: 900, cursor: 'pointer',
  },
};
