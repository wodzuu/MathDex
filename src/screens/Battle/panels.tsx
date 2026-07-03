/**
 * Battle bottom-panel components: the move list and the Math / Potion / Ball /
 * Catch views that swap in below the arena. Purely presentational — all battle
 * logic stays in the screen (index.tsx) and the challenge queue hook.
 */

import { useEffect, useRef } from 'react';
import type { PokeType } from '../../types/pokemon';
import type { MathPuzzle } from '../../types/math';
import type { Pokeballs, Potions } from '../../types/gameState';
import { D, FONT_PIXEL, FONT_UI, typeColors } from '../../styles/tokens';
import { getBallSpriteUrl, getItemSpriteUrl } from '../../lib/sprites';
import { catchProbability, hpZone } from '../../lib/formulas';
import TypeBadge from '../../components/ui/TypeBadge';
import NumberPad from '../../components/ui/NumberPad';
import { BALLS, type BallOption, type MoveSlot } from './battleData';
import type { ChallengeQueue } from './useChallengeQueue';
import b from './Battle.module.css';

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '12px 14px', fontFamily: FONT_UI, fontSize: 14,
      fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: 0.5,
      background: D.card, color: D.white, border: `2px solid ${D.border}`,
      borderRadius: 12, cursor: 'pointer',
    }}>
      ← Back
    </button>
  );
}

/** Countdown readout + progress bar shared by the math and catch panels.
 *  While `ready` is true the clock hasn't started — a "READY…" beat flashes. */
function TimerBlock({ timer, limit, ready }: { timer: number; limit: number; ready?: boolean }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 44, flexShrink: 0 }}>
      <div style={{ fontFamily: FONT_PIXEL, fontSize: 24, lineHeight: 1.2, color: ready ? D.muted : timer <= 2 ? D.red : timer <= 4 ? D.yellow : D.white, ...(!ready && timer <= 2 ? { animation: 'timerPulse .4s ease-in-out infinite' } : {}) }}>
        {timer}
      </div>
      <div style={{ fontFamily: FONT_PIXEL, fontSize: 7, color: ready ? D.yellow : D.muted, marginTop: 2, ...(ready ? { animation: 'timerPulse .5s ease-in-out infinite' } : {}) }}>
        {ready ? 'READY…' : 'SEC'}
      </div>
      <div style={{ width: 38, height: 4, background: '#111', border: `1px solid ${D.border}`, borderRadius: 2, margin: '5px auto 0', overflow: 'hidden' }}>
        <div style={{ width: `${(timer / limit) * 100}%`, height: '100%', background: D.yellow, transition: 'width 1s linear' }} />
      </div>
    </div>
  );
}

// ── Move list ─────────────────────────────────────────────────────────────────

export interface SortedMove {
  slot: MoveSlot;
  isStatus: boolean;
  dmg: number | null;
  seType?: PokeType;
  eff: 'super' | 'resist' | 'neutral' | 'status';
}

interface MoveListProps {
  moves: SortedMove[];
  playerFainted: boolean;
  playerName: string;
  critReady: boolean;
  potionCount: number;
  ballCount: number;
  onPick: (slot: MoveSlot) => void;
  onPotion: () => void;
  onBall: () => void;
}

export function MoveList({ moves, playerFainted, playerName, critReady, potionCount, ballCount, onPick, onPotion, onBall }: MoveListProps) {
  return (
    <div className={`${b.movePanel} fade-up`}>
      <div className={b.moveTitle} style={{ color: playerFainted ? '#e0574f' : '#aeb8d6' }}>
        {playerFainted ? `${playerName} fainted — switch with ‹ ›` : 'Choose a move'}
      </div>
      {moves.map(({ slot, isStatus, dmg, seType, eff }) => {
        const outOfPp   = slot.currentPp === 0 || playerFainted;
        const tc        = typeColors(slot.type);
        const rowBg     = eff === 'super' ? '#15301c' : eff === 'resist' ? '#2a1416' : '#222a40';
        const rowBorder = eff === 'super' ? '#5fc46a' : eff === 'resist' ? '#b9564e' : 'transparent';
        const stripe    = eff === 'super' ? '#5fc46a' : eff === 'resist' ? '#b9564e' : tc.fg;
        const dmgCol    = eff === 'super' ? '#6fe07a' : eff === 'resist' ? '#e0857a' : (critReady ? '#ff7b00' : '#ff9a3c');
        return (
          <button key={slot.moveId} className={b.moveRow} disabled={outOfPp} onClick={() => onPick(slot)} style={{ background: rowBg, borderColor: rowBorder }}>
            <span className={b.moveStripe} style={{ background: stripe }} />
            <span className={b.moveName} style={{ color: outOfPp ? '#8892b8' : '#f0f4ff' }}>{slot.name}</span>
            <span className={b.moveTypePill} style={{ background: tc.bg, color: tc.fg, border: `1px solid ${tc.bdr}` }}>{slot.type}</span>
            {seType && <span className={b.superBadge}>×2 vs {seType.toUpperCase()}</span>}
            {isStatus && <span className={b.statusTag}>STATUS</span>}
            <span className={b.moveDmg}>
              {outOfPp
                ? <span className={b.moveDmgNum} style={{ fontSize: 10, color: '#8892b8' }}>NO PP</span>
                : <>
                    <span className={b.moveDmgNum} style={{ color: isStatus ? '#aeb8d6' : dmgCol }}>{dmg ?? '–'}</span>
                    <span className={b.moveDmgLabel} style={{ color: isStatus ? '#aeb8d6' : dmgCol }}>DMG</span>
                  </>}
            </span>
          </button>
        );
      })}
      <div className={b.actionRow}>
        <button className={b.actionBtn} style={{ borderColor: '#2f6e3a', background: '#0a1a0a', color: '#7fcf86' }} onClick={onPotion}>
          <img src={getItemSpriteUrl('potion')} alt="" style={{ width: 18, height: 18, imageRendering: 'pixelated', objectFit: 'contain' }} />Potion ×{potionCount}
        </button>
        <button className={b.actionBtn} style={{ borderColor: '#6a4a8a', background: '#1a1320', color: '#c79af0' }} onClick={onBall}>
          <img src={getBallSpriteUrl('pokeball')} alt="" style={{ width: 18, height: 18, imageRendering: 'pixelated', objectFit: 'contain' }} />Ball ×{ballCount}
        </button>
      </div>
    </div>
  );
}

// ── Math challenge panel (multiple challenges per move) ───────────────────────

interface MathPanelProps {
  move: MoveSlot;
  q: ChallengeQueue;
  isSuperEff: boolean;
  onBack: () => void;
  onDeal: () => void;
}

export function MathPanel({ move, q, isSuperEff, onBack, onDeal }: MathPanelProps) {
  const { challenges, chAnswers, answer, timer, idx, allAnswered } = q;
  return (
    <div className="fade-up" style={{ background: D.card, border: `3px solid ${D.yellow}`, borderRadius: 16, padding: 16, boxShadow: `4px 4px 0 ${D.yellow}40`, transition: 'background .4s' }}>
      {/* Header: move + progress + (current) timer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <TypeBadge type={move.type} large />
            <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>{move.name.toUpperCase()}</span>
          </div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>
            {allAnswered ? `${q.correctCount}/${challenges.length} CORRECT` : `CHALLENGE ${idx + 1}/${challenges.length}`}
          </div>
          {isSuperEff && <div className="supereff-badge" style={{ marginTop: 8 }}>SUPER EFFECTIVE!</div>}
        </div>
        {/* Current-challenge timer (each challenge has its own countdown) */}
        {!allAnswered && <TimerBlock timer={timer} limit={q.curTimeLimit} ready={q.ready} />}
      </div>

      {/* Stacked challenges — earlier ones stay visible with the typed answer.
          ✅/❌ + the damage penalty stay hidden until every answer is in; the
          reveal also teaches the correct answer on every wrong row. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {challenges.map((p, i) => {
          const ans       = chAnswers[i];
          const isCurrent = !allAnswered && i === idx;
          const isDone    = i < idx;                       // answered, pre-reveal
          const correct   = ans != null && ans === p.answer;
          // Substitute the player's answer into the equation once it's locked in;
          // the live row reflects what's being typed right now.
          const filled    = ans == null ? '·' : String(ans);
          const liveTyped = answer.trim() !== '' ? answer : '?';
          const rowBg     = allAnswered ? (correct ? '#0d2a10' : '#2a0d0d')
                          : isCurrent ? '#1a1c12' : D.darker;
          const rowBd     = allAnswered ? (correct ? D.green : D.red)
                          : isCurrent ? D.yellow : D.border;
          const revealedWrong = allAnswered && !correct;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: rowBg, border: `2px solid ${rowBd}`, borderRadius: 10, padding: '9px 11px', opacity: !allAnswered && i > idx ? 0.45 : 1 }}>
              <span style={{ fontFamily: FONT_PIXEL, fontSize: 15, color: isCurrent ? D.yellow : D.white, lineHeight: 1.5, flex: 1 }}>
                {p.isReview && <span title="Review challenge">⭐ </span>}
                {revealedWrong ? (
                  <>
                    {p.equation.replace('?', '')}
                    <s style={{ color: D.red, opacity: 0.85 }}>{filled}</s>
                    {' '}
                    <span style={{ color: D.green }}>{p.answer}</span>
                  </>
                ) : (
                  isCurrent ? p.equation.replace('?', liveTyped)
                  : (isDone || allAnswered) ? p.equation.replace('?', filled)
                  : p.equation
                )}
              </span>
              {allAnswered && (correct
                ? <span style={{ fontSize: 16 }}>✅</span>
                : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.red }}>-{q.deduction}</span>
                    <span style={{ fontSize: 16 }}>❌</span>
                  </span>
              )}
            </div>
          );
        })}
      </div>

      {!allAnswered ? (
        <>
          <NumberPad
            value={answer}
            onChange={q.setAnswer}
            onSubmit={() => q.submitTyped()}
            submitLabel={idx === challenges.length - 1 ? 'CHECK' : 'NEXT'}
          />
          <button onClick={onBack} style={{ width: '100%', marginTop: 8, padding: '8px', fontFamily: FONT_UI, fontSize: 12, fontWeight: 800, background: 'transparent', color: D.muted, border: `1px solid ${D.border}`, borderRadius: 10, cursor: 'pointer' }}>← Cancel move</button>
        </>
      ) : (
        <>
          {q.wrongCount === 0 && (
            <div className="pulsing" style={{ textAlign: 'center', fontFamily: FONT_PIXEL, fontSize: 10, color: D.yellow, marginBottom: 10 }}>
              ⭐ PERFECT — FULL POWER! ⭐
            </div>
          )}
          <button onClick={onDeal} style={{ width: '100%', padding: '14px', fontFamily: FONT_UI, fontSize: 16, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: 0.5, background: q.finalDamage > 0 ? D.green : D.border2, color: q.finalDamage > 0 ? '#06210e' : D.muted, border: '2px solid rgba(0,0,0,.15)', borderRadius: 12, cursor: 'pointer', boxShadow: q.finalDamage > 0 ? '0 4px 0 #1d6b38' : 'none' }}>
            Deal {q.finalDamage} damage
          </button>
        </>
      )}
      <ScrollAnchor deps={[idx, allAnswered]} />
    </div>
  );
}

/** Keeps the pad / deal button in view as the challenge stack grows. */
function ScrollAnchor({ deps }: { deps: unknown[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <div ref={ref} />;
}

// ── Potion panel ──────────────────────────────────────────────────────────────

interface PotionPanelProps {
  potions: Potions;
  message: string | null;
  onUse: (key: keyof Potions) => void;
  onBack: () => void;
}

export function PotionPanel({ potions, message, onUse, onBack }: PotionPanelProps) {
  return (
    <div className="fade-up">
      <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.muted, marginBottom: 8 }}>Use a Potion — costs your turn</div>
      {([
        { key: 'potion'      as const, name: 'Potion',       heal: 20,  count: potions.potion      },
        { key: 'superPotion' as const, name: 'Super Potion', heal: 60,  count: potions.superPotion },
        { key: 'hyperPotion' as const, name: 'Hyper Potion', heal: 120, count: potions.hyperPotion },
      ]).map((p) => (
        <button key={p.key} onClick={() => p.count > 0 && onUse(p.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: D.card, border: `2px solid ${p.count > 0 ? D.green : D.border}`, borderRadius: 14, padding: '12px 14px', cursor: p.count > 0 ? 'pointer' : 'not-allowed', marginBottom: 8, fontFamily: FONT_UI, color: D.white, opacity: p.count > 0 ? 1 : 0.65, transition: 'all .15s' }}>
          <img src={getItemSpriteUrl(p.key)} alt={p.name} style={{ width: 38, height: 38, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: D.white }}>{p.name}</div>
            <div style={{ fontSize: 12, color: D.green, fontWeight: 700 }}>Restores +{p.heal} HP</div>
          </div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 11, color: D.white }}>×{p.count}</div>
        </button>
      ))}
      {message && <div style={{ fontFamily: FONT_PIXEL, fontSize: 10, textAlign: 'center', color: D.green, padding: 8 }}>{message}</div>}
      <BackBtn onClick={onBack} />
    </div>
  );
}

// ── Ball panel ────────────────────────────────────────────────────────────────

interface BallPanelProps {
  enemyHpPct: number;
  enemyCatchRate: number;
  pokeballs: Pokeballs;
  /** Already-caught indicator inputs. */
  enemyName: string;
  enemyLevel: number;
  alreadyCaught: boolean;
  catchWouldRelease: boolean;
  ownedBestLevel: number;
  onSelect: (ball: BallOption) => void;
  onBack: () => void;
}

export function BallPanel(props: BallPanelProps) {
  const { enemyHpPct, enemyCatchRate, pokeballs, enemyName, enemyLevel, alreadyCaught, catchWouldRelease, ownedBestLevel, onSelect, onBack } = props;
  const zone      = hpZone(enemyHpPct);
  const zoneCol   = zone === 'red' ? D.red : zone === 'orange' ? D.yellow : D.green;
  const zoneLabel = zone === 'red' ? 'Low HP — high catch!' : zone === 'orange' ? 'Half HP — better chance' : 'High HP — low chance';
  const ballCounts: Record<string, number> = {
    'Poké Ball':  pokeballs.pokeball  ?? 0,
    'Great Ball': pokeballs.greatBall ?? 0,
    'Ultra Ball': pokeballs.ultraBall ?? 0,
  };
  // Pokédex / already-caught indicator. Only one per species is kept, so warn
  // when a catch would just be released.
  const caughtCol  = !alreadyCaught ? D.green : catchWouldRelease ? D.red : D.yellow;
  const caughtIcon = !alreadyCaught ? '✨' : catchWouldRelease ? '⚠️' : '⬆️';
  const caughtText = !alreadyCaught
    ? `New! You haven't caught ${enemyName} yet`
    : catchWouldRelease
      ? `You already have a Lv${ownedBestLevel} ${enemyName} — this Lv${enemyLevel} one will be released`
      : `You have a Lv${ownedBestLevel} ${enemyName} — this stronger Lv${enemyLevel} one will replace it`;
  const hoverCol = typeColors('Water').fg;
  return (
    <div className="fade-up">
      <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color: D.muted, marginBottom: 8 }}>Throw a Poké Ball</div>
      {/* HP zone indicator */}
      <div style={{ background: D.card, border: `1px solid ${zoneCol}`, borderRadius: 10, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: zoneCol, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: zoneCol }}>{zoneLabel}</span>
      </div>
      <div style={{ background: D.card, border: `1px solid ${caughtCol}`, borderRadius: 10, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{caughtIcon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: caughtCol, lineHeight: 1.4 }}>{caughtText}</span>
      </div>
      {BALLS.map((ball) => {
        const count    = ballCounts[ball.name] ?? 0;
        const baseProb = catchProbability(enemyCatchRate, ball.baseRate, enemyHpPct);
        const pCorrect = Math.round(baseProb * 100);
        const pWrong   = Math.round(baseProb * 0.75 * 100);
        return (
          <button key={ball.name} onClick={() => count > 0 && onSelect(ball)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: D.card, border: `2px solid ${D.border}`, borderRadius: 14, padding: '12px 14px', cursor: count > 0 ? 'pointer' : 'not-allowed', marginBottom: 8, fontFamily: FONT_UI, color: D.white, opacity: count > 0 ? 1 : 0.65, transition: 'border-color .15s' }}
            onMouseEnter={(e) => { if (count > 0) e.currentTarget.style.borderColor = hoverCol; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = D.border; }}>
            <img src={getBallSpriteUrl(ball.consumableKey)} alt={ball.name} style={{ width: 38, height: 38, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: D.white }}>{ball.name}</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: D.green }}>{pCorrect}% if solved</span>
                <span style={{ color: D.muted }}> · {pWrong}% if not</span>
              </div>
            </div>
            <div style={{ fontFamily: FONT_PIXEL, fontSize: 11, color: D.white }}>×{count}</div>
          </button>
        );
      })}
      <BackBtn onClick={onBack} />
    </div>
  );
}

// ── Catch puzzle panel ────────────────────────────────────────────────────────

interface CatchPanelProps {
  ball: BallOption;
  puzzle: MathPuzzle;
  /** 'escaped' after a failed throw; a successful catch leaves this panel entirely. */
  catchResult: 'caught' | 'escaped' | null;
  /** Answer feedback ('ok'/'no') once the throw resolves. */
  result: 'ok' | 'no' | null;
  /** True while the ball-throw animation plays in the arena. */
  throwing: boolean;
  ready: boolean;
  enemyHpPct: number;
  timer: number;
  answer: string;
  setAnswer: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function CatchPanel({ ball, puzzle, catchResult, result, throwing, ready, enemyHpPct, timer, answer, setAnswer, onSubmit, onBack }: CatchPanelProps) {
  const zone    = hpZone(enemyHpPct);
  const zoneCol = zone === 'red' ? D.red : zone === 'orange' ? D.yellow : D.green;
  const bgColor = catchResult === 'escaped' ? '#2a0d0d' : result === 'ok' ? '#0d2a10' : result === 'no' ? '#2a0d0d' : D.card;
  return (
    <div className="fade-up" style={{ background: bgColor, border: `3px solid ${D.yellow}`, borderRadius: 16, padding: 16, boxShadow: `4px 4px 0 ${D.yellow}40`, transition: 'background .4s' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <img src={getBallSpriteUrl(ball.consumableKey)} alt={ball.name} style={{ width: 22, height: 22, imageRendering: 'pixelated', objectFit: 'contain' }} />
            <span style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: D.muted }}>{ball.name.toUpperCase()}</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: zoneCol, display: 'inline-block' }} />
          </div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 19, color: D.yellow, lineHeight: 1.8 }}>
            {puzzle.isReview && <span title="Review challenge">⭐ </span>}
            {puzzle.equation}
          </div>
        </div>
        {!catchResult && !throwing && <TimerBlock timer={timer} limit={puzzle.timeLimitSeconds ?? 6} ready={ready} />}
      </div>

      {/* Ball in flight, escaped result, or the answer pad. A successful catch
          leaves this panel for the full-screen summary. */}
      {throwing ? (
        <div style={{ textAlign: 'center', padding: '18px 0' }}>
          <div className="pulsing" style={{ fontFamily: FONT_PIXEL, fontSize: 10, color: D.yellow }}>
            You threw a {ball.name.toUpperCase()}…
          </div>
        </div>
      ) : catchResult === 'escaped' ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>💨</div>
          <div style={{ fontFamily: FONT_PIXEL, fontSize: 11, color: D.red }}>It escaped!</div>
        </div>
      ) : (
        <>
          <div style={{ width: '100%', fontFamily: FONT_PIXEL, fontSize: 22, textAlign: 'center', background: D.darker, color: answer ? D.white : D.muted, border: `2px solid ${D.border2}`, borderRadius: 10, padding: 12, marginBottom: 8, boxSizing: 'border-box' }}>
            {answer || '?'}
          </div>
          <NumberPad value={answer} onChange={setAnswer} onSubmit={onSubmit} submitLabel="THROW!" />
          <button onClick={onBack} style={{ width: '100%', marginTop: 8, padding: '8px', fontFamily: FONT_UI, fontSize: 12, fontWeight: 800, background: 'transparent', color: D.muted, border: `1px solid ${D.border}`, borderRadius: 10, cursor: 'pointer' }}>← Pick another ball</button>
        </>
      )}
    </div>
  );
}
