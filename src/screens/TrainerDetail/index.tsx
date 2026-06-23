/**
 * Trainer detail — reached by tapping the Trainer Card in Town. Shows the
 * trainer's picture and name, then the Math Rank ladder: every rank with a
 * short description, whether it's completed, and — for the current rank — how
 * close the player is to ranking up.
 */

import { useNavigate } from 'react-router-dom';

import { useActiveTrainer } from '../../store/gameStore';
import { MATH_RANKS, MATH_WINDOW_SIZE, MATH_RANKUP_THRESHOLD, MAX_MATH_RANK, clampMathRank } from '../../data/curriculum';
import { asset } from '../../lib/assets';

import s from './TrainerDetail.module.css';

const TRAINER_IMG = asset('trainer.png');
// Correct answers (out of the rolling window) needed to advance a rank.
const TARGET_CORRECT = Math.round(MATH_WINDOW_SIZE * MATH_RANKUP_THRESHOLD);

export default function TrainerDetailScreen() {
  const navigate = useNavigate();
  const trainer  = useActiveTrainer();

  const currentRank      = clampMathRank(trainer.mathRank ?? 1);
  const correctInWindow  = (trainer.mathWindow ?? []).filter(Boolean).length;

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}>← Back</button>
        <span className={s.title}>Trainer</span>
        <span className={s.headerSpacer} />
      </div>

      <div className={s.hero}>
        <img className={s.avatar} src={TRAINER_IMG} alt={trainer.name} />
        <div className={s.name}>{trainer.name}</div>
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
    </div>
  );
}
