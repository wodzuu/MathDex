/**
 * Trainer detail — reached by tapping the Trainer Card in Town. Shows the
 * trainer's picture and name, then the Math Rank ladder: every rank with a
 * short description, whether it's completed, and — for the current rank — how
 * close the player is to ranking up.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import { useActiveTrainer, useGameStore, getLeadInstanceId } from '../../store/gameStore';
import {
  MATH_RANKS, MATH_WINDOW_SIZE, MATH_RANKUP_THRESHOLD, MAX_MATH_RANK, clampMathRank,
  MIN_CALC_SPEED, MAX_CALC_SPEED, DEFAULT_CALC_SPEED, clampCalcSpeed,
} from '../../data/curriculum';
import { getSpecies } from '../../data/species';
import PokemonSprite from '../../components/ui/PokemonSprite';
import ImportSave from '../../components/ImportSave';
import { asset } from '../../lib/assets';
import { exportSaveToFile } from '../../lib/saveCodec';
import ScreenBackdrop from '../../components/ui/ScreenBackdrop';

import s from './TrainerDetail.module.css';

const TRAINER_IMG = asset('trainer.png');
const TRAINER_BG  = asset('trainer_bg.jpg');
// Dims the house backdrop toward the bottom for readability.
const TRAINER_SCRIM = 'linear-gradient(180deg, rgba(10, 18, 32, 0.35) 0%, rgba(10, 18, 32, 0.45) 45%, rgba(10, 18, 32, 0.82) 100%)';
// Correct answers (out of the rolling window) needed to advance a rank.
const TARGET_CORRECT = Math.round(MATH_WINDOW_SIZE * MATH_RANKUP_THRESHOLD);
// Kid-friendly names for the 1–5 calculation-speed setting.
const CALC_SPEED_LABELS = ['Take my time', 'Steady', 'Normal', 'Quick', 'Lightning'] as const;

export default function TrainerDetailScreen() {
  const navigate = useNavigate();
  const trainer  = useActiveTrainer();

  const { trainers, activeTrainerId, setActiveTrainer, renameActiveTrainer, deleteTrainer, setCalcSpeed } = useGameStore(
    useShallow((st) => ({ trainers: st.trainers, activeTrainerId: st.activeTrainerId, setActiveTrainer: st.setActiveTrainer, renameActiveTrainer: st.renameActiveTrainer, deleteTrainer: st.deleteTrainer, setCalcSpeed: st.setCalcSpeed })),
  );

  const calcSpeed = clampCalcSpeed(trainer.calcSpeed ?? DEFAULT_CALC_SPEED);

  // Inline editing of the trainer's name + calculation speed (one ✓ commits both).
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState('');
  const [speedDraft, setSpeedDraft] = useState(calcSpeed);
  const startEdit  = () => { setDraft(trainer.name); setSpeedDraft(calcSpeed); setEditing(true); };
  const commitEdit = () => { renameActiveTrainer(draft); setCalcSpeed(speedDraft); setEditing(false); };

  // Delete confirmation — requires typing the word "delete".
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const canDelete = confirmText.trim().toLowerCase() === 'delete';
  const openConfirm  = () => { setConfirmText(''); setConfirming(true); };
  const handleDelete = () => {
    if (!canDelete) return;
    const wasLast = trainers.length <= 1;
    deleteTrainer(activeTrainerId);
    setConfirming(false);
    if (wasLast) navigate('/new-trainer', { replace: true });
  };

  const currentRank      = clampMathRank(trainer.mathRank ?? 1);
  const correctInWindow  = (trainer.mathWindow ?? []).filter(Boolean).length;

  return (
    <div className={s.screen}>
      <ScreenBackdrop src={TRAINER_BG} scrim={TRAINER_SCRIM} />
      <div className={s.content}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}>← Back</button>
        <span className={s.title}>Trainer</span>
        <span className={s.headerSpacer} />
      </div>

      <div className={s.hero}>
        <img className={s.avatar} src={TRAINER_IMG} alt={trainer.name} />
        {editing ? (
          <div className={s.editCard}>
            <div className={s.nameEdit}>
              <input
                className={s.nameInput}
                value={draft}
                maxLength={12}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
              />
            </div>

            <div className={s.speedEdit}>
              <div className={s.speedTop}>
                <span className={s.speedEditLabel}>Calculation speed</span>
                <span className={s.speedValue}>{CALC_SPEED_LABELS[speedDraft - 1]} · {speedDraft}/{MAX_CALC_SPEED}</span>
              </div>
              <input
                className={s.speedSlider}
                type="range"
                min={MIN_CALC_SPEED}
                max={MAX_CALC_SPEED}
                step={1}
                value={speedDraft}
                aria-label="Calculation speed"
                onChange={(e) => setSpeedDraft(Number(e.target.value))}
              />
              <div className={s.speedHint}>Faster means less time on the clock for each math challenge.</div>
            </div>

            <div className={s.editActions}>
              <button className={s.nameCancel} onClick={() => setEditing(false)}>✕ Cancel</button>
              <button className={s.nameSave} onClick={commitEdit} disabled={!draft.trim()}>✓ Save</button>
            </div>
          </div>
        ) : (
          <button className={s.nameBtn} onClick={startEdit} aria-label="Edit trainer name and calculation speed">
            <span className={s.nameLine}>
              <span className={s.name}>{trainer.name}</span>
              <span className={s.editIcon}>✎</span>
            </span>
            <span className={s.speedSummary}>
              Calculation speed: <b>{CALC_SPEED_LABELS[calcSpeed - 1]}</b> ({calcSpeed}/{MAX_CALC_SPEED})
            </span>
          </button>
        )}
      </div>

      <div className={s.sectionLabel}>Trainers</div>
      <div className={s.trainerRow}>
        {trainers.map((t) => {
          const lead = t.caughtPokemon.find((p) => p.instanceId === getLeadInstanceId(t));
          const dex  = lead ? getSpecies(lead.speciesId)?.dexNumber ?? 1 : 1;
          const isActive = t.id === activeTrainerId;
          return (
            <button
              key={t.id}
              className={`${s.tChip} ${isActive ? s.tChipActive : ''}`}
              onClick={() => { if (!isActive) setActiveTrainer(t.id); }}
            >
              <PokemonSprite className={s.tChipImg} dex={dex} />
              <span className={s.tChipName}>{t.name}</span>
              {isActive && <span className={s.tChipBadge}>ACTIVE</span>}
            </button>
          );
        })}
        <button className={`${s.tChip} ${s.tChipNew}`} onClick={() => navigate('/new-trainer')}>
          <span className={s.tChipPlus}>+</span>
          <span className={s.tChipName}>New</span>
        </button>
      </div>

      <div className={s.sectionLabel}>Stats</div>
      <div className={s.statGrid}>
        <div className={s.statCard}>
          <div className={s.statNum} style={{ color: '#48c774' }}>{trainer.stats.totalProblemsSolved}</div>
          <div className={s.statName}>Correct answers</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statNum} style={{ color: '#FFCB05' }}>{trainer.stats.longestStreak}×</div>
          <div className={s.statName}>Best streak</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statNum} style={{ color: '#9070B8' }}>{trainer.stats.totalCatches}</div>
          <div className={s.statName}>Pokémon caught</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statNum} style={{ color: '#6890F0', fontSize: 13 }}>Level {trainer.stats.highestOpponentLevel ?? 0}</div>
          <div className={s.statName}>Top enemy</div>
        </div>
      </div>

      <div className={s.sectionLabel}>Math ranks</div>
      <div className={s.ranks}>
        {MATH_RANKS.map((r, i) => {
          const rank    = i + 1;
          const done    = rank < currentRank;
          const current = rank === currentRank;
          const isMax   = rank === MAX_MATH_RANK;
          const pct     = current && !isMax ? Math.min(100, Math.round((correctInWindow / TARGET_CORRECT) * 100)) : 0;
          const rowCls  = done ? s.rankDone : current ? s.rankCurrent : s.rankLocked;

          return (
            <div key={rank} className={`${s.rankRow} ${rowCls}`}>
              <div className={s.rankNum}>{rank}</div>
              <div className={s.rankBody}>
                <div className={s.rankTop}>
                  <span className={s.rankLabel}>{r.label}</span>
                  {done && <span className={s.statusDone}>✓ Completed</span>}
                  {current && (isMax ? <span className={s.statusCurrent}>★ Top rank</span> : <span className={s.statusCurrent}>In progress</span>)}
                  {!done && !current && <span className={s.statusLocked}>Locked</span>}
                </div>
                {current && !isMax && (
                  <>
                    <div className={s.progTrack}><div className={s.progFill} style={{ width: `${pct}%` }} /></div>
                    <div className={s.progLabel}>{correctInWindow} / {TARGET_CORRECT} correct answers to rank up</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={s.sectionLabel}>Save data</div>
      <div className={s.saveRow}>
        <button
          className={s.saveBtn}
          onClick={() => {
            const { version, activeTrainerId: aid, trainers: ts, settings } = useGameStore.getState();
            void exportSaveToFile({ version, activeTrainerId: aid, trainers: ts, settings });
          }}
        >
          📤 Export save
        </button>
        <ImportSave className={s.saveBtn}>📥 Import save</ImportSave>
      </div>

      <button className={s.deleteLink} onClick={openConfirm}>🗑 Delete {trainer.name}</button>

      {confirming && (
        <div className={s.modalOverlay} role="dialog" aria-modal="true">
          <div className={s.modalCard}>
            <div className={s.modalWarn}>⚠️</div>
            <div className={s.modalTitle}>Delete {trainer.name}?</div>
            <div className={s.modalText}>
              This <b>permanently</b> deletes this trainer along with all their Pokémon,
              items, money, and progress. This <b>cannot be undone</b>.
            </div>
            <div className={s.modalHint}>Type <b>delete</b> to confirm:</div>
            <input
              className={s.modalInput}
              value={confirmText}
              autoFocus
              placeholder="delete"
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(); if (e.key === 'Escape') setConfirming(false); }}
            />
            <div className={s.modalRow}>
              <button className={s.btnGhost} onClick={() => setConfirming(false)}>Cancel</button>
              <button className={s.btnDanger} onClick={handleDelete} disabled={!canDelete}>Delete forever</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
