/**
 * Save export/import — the codec (pure) plus the one DOM helper that hands the
 * exported file to the player.
 *
 * The export is the full GameState (all trainers, one blob — mirrors the single
 * Dexie row) wrapped in a small envelope so imports can be recognised and
 * rejected with friendly errors. decodeSave() is the paranoid half: everything
 * a hand-edited or truncated file could get wrong is caught here, so the
 * screens can treat a decoded save as trustworthy.
 */

import type { GameState, Trainer } from '../types';

const FORMAT = 'mathdex-save';

interface SaveEnvelope {
  format: typeof FORMAT;
  exportedAt: string;
  state: GameState;
}

export function encodeSave(state: GameState): string {
  const envelope: SaveEnvelope = {
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    state,
  };
  return JSON.stringify(envelope, null, 2);
}

export function saveFileName(now = new Date()): string {
  return `mathdex-save-${now.toISOString().slice(0, 10)}.json`;
}

/**
 * Parse + validate an exported save. Accepts the envelope, or a bare GameState
 * (e.g. copied straight out of IndexedDB devtools). Throws an Error with a
 * player-friendly message on anything that doesn't look like a MathDex save.
 */
export function decodeSave(text: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file could not be read — it is not a MathDex save.');
  }

  const envelope = parsed as Partial<SaveEnvelope>;
  const candidate = envelope.format === FORMAT ? envelope.state : parsed;
  if (!isRecord(candidate)) throw badSave();

  const { version, activeTrainerId, trainers } = candidate;
  if (typeof version !== 'number' || !Array.isArray(trainers)) throw badSave();
  if (!trainers.every(isTrainerLike)) throw badSave();

  return {
    version,
    // Heal a dangling active id (hand-edited file) instead of rejecting it.
    activeTrainerId:
      trainers.some((t) => t.id === activeTrainerId) ? (activeTrainerId as string)
      : trainers[0]?.id ?? '',
    trainers: trainers as Trainer[],
    settings: isRecord(candidate.settings) ? candidate.settings : {},
  };
}

/**
 * Share the exported save via the native share sheet (Files / AirDrop /
 * Messages on iOS) when available, otherwise download it as a plain file.
 */
export async function exportSaveToFile(state: GameState): Promise<void> {
  const json = encodeSave(state);
  const name = saveFileName();
  const file = new File([json], name, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'MathDex save' });
      return;
    } catch (err) {
      // Player closed the share sheet — not an error, and not a download either.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Any other share failure falls through to the download path.
    }
  }

  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Shallow structural check of the fields every screen dereferences. */
function isTrainerLike(v: unknown): v is Trainer {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.caughtPokemon) &&
    Array.isArray(v.party) &&
    typeof v.pokeDollars === 'number' &&
    isRecord(v.pokeballs) &&
    isRecord(v.potions) &&
    isRecord(v.stats)
  );
}

function badSave(): Error {
  return new Error("That file doesn't look like a MathDex save.");
}
