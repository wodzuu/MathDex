/**
 * Multi-challenge attack state machine (spec §4.3).
 *
 * Picking a move queues several math puzzles. The player answers them one at a
 * time — each with its own countdown — with NO feedback; once all are answered
 * the caller reveals ✅/❌ and shows the "Deal N damage" button. 50% of the
 * move's damage is guaranteed; each wrong answer forfeits an equal share of the
 * other 50%.
 *
 * The hook owns the queue, the typed answer, and the countdown interval. Refs
 * mirror the queue/answer so the long-lived interval never reads stale state.
 * The countdown is also reused by the single-puzzle catch flow (via startTimer
 * without an expiry callback — the caller watches `timer === 0` itself).
 */

import { useState, useRef, useEffect } from 'react';
import type { MathPuzzle } from '../../types/math';

export interface ChallengeQueue {
  // State
  challenges: MathPuzzle[];
  chAnswers: (number | null)[];
  answer: string;
  setAnswer: (v: string) => void;
  timer: number;
  baseDmg: number;
  isCrit: boolean;
  inpRef: React.RefObject<HTMLInputElement>;
  // Derived
  idx: number;
  allAnswered: boolean;
  correctCount: number;
  wrongCount: number;
  /** Damage forfeited per wrong answer (an equal share of the earnable half). */
  deduction: number;
  /** Damage the "Deal N damage" button will apply. */
  finalDamage: number;
  curTimeLimit: number;
  // Actions
  begin: (puzzles: MathPuzzle[], baseDmg: number, isCrit: boolean) => void;
  submitTyped: () => void;
  clear: () => void;
  startTimer: (seconds: number, onExpire?: () => void) => void;
  stopTimer: () => void;
}

const DEFAULT_TIME = 6;

export function useChallengeQueue(): ChallengeQueue {
  const [challenges, setChallenges] = useState<MathPuzzle[]>([]);
  const [chAnswers, setChAnswers]   = useState<(number | null)[]>([]);
  const [answer, setAnswer]         = useState('');
  const [timer, setTimer]           = useState(DEFAULT_TIME);
  const [baseDmg, setBaseDmg]       = useState(0);   // move's full damage (incl. crit)
  const [isCrit, setIsCrit]         = useState(false);

  // Synchronous mirrors so the countdown interval and appendAnswer always read
  // the current queue / answers / typed value.
  const challengesRef = useRef<MathPuzzle[]>([]);
  const chAnswersRef  = useRef<(number | null)[]>([]);
  const answerRef     = useRef('');
  const tiRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const inpRef        = useRef<HTMLInputElement>(null);

  useEffect(() => { answerRef.current     = answer; }, [answer]);
  useEffect(() => { challengesRef.current = challenges; }, [challenges]);
  useEffect(() => { chAnswersRef.current  = chAnswers; }, [chAnswers]);
  useEffect(() => () => { if (tiRef.current) clearInterval(tiRef.current); }, []);

  function stopTimer() {
    if (tiRef.current) { clearInterval(tiRef.current); tiRef.current = null; }
  }

  // Countdown. `remaining` lives in a local so the interval never reads stale
  // React state; on expiry it fires onExpire (or just rests at 0).
  function startTimer(seconds: number, onExpire?: () => void) {
    stopTimer();
    setTimer(seconds);
    let remaining = seconds;
    tiRef.current = setInterval(() => {
      remaining -= 1;
      setTimer(Math.max(0, remaining));
      if (remaining <= 0) {
        stopTimer();
        onExpire?.();
      }
    }, 1000);
  }

  /** Expiry for a challenge countdown: lock in whatever is typed (blank → null). */
  function expireChallenge() {
    const v = parseInt(answerRef.current, 10);
    appendAnswer(Number.isNaN(v) ? null : v);
  }

  // Lock in the current challenge's answer and move to the next one (or, when the
  // last is answered, stop the clock so the reveal + "Deal damage" button shows).
  function appendAnswer(value: number | null) {
    const total = challengesRef.current.length;
    const prev  = chAnswersRef.current;
    if (total === 0 || prev.length >= total) return;   // nothing pending
    const next = [...prev, value];
    chAnswersRef.current = next;
    setChAnswers(next);
    setAnswer('');
    answerRef.current = '';
    if (next.length < total) {
      startTimer(challengesRef.current[next.length].timeLimitSeconds ?? DEFAULT_TIME, expireChallenge);
      setTimeout(() => inpRef.current?.focus(), 60);
    } else {
      stopTimer();
    }
  }

  function begin(puzzles: MathPuzzle[], dmg: number, crit: boolean) {
    setChallenges(puzzles);   challengesRef.current = puzzles;
    setChAnswers([]);         chAnswersRef.current  = [];
    setBaseDmg(dmg);
    setIsCrit(crit);
    setAnswer('');            answerRef.current = '';
    startTimer(puzzles[0]?.timeLimitSeconds ?? DEFAULT_TIME, expireChallenge);
    setTimeout(() => inpRef.current?.focus(), 80);
  }

  /** Lock in the typed answer (no feedback yet) and advance. */
  function submitTyped() {
    if (challenges.length === 0 || chAnswers.length >= challenges.length) return;
    const v = parseInt(answer, 10);
    if (isNaN(v)) return;
    appendAnswer(v);
  }

  function clear() {
    setChallenges([]);  challengesRef.current = [];
    setChAnswers([]);   chAnswersRef.current  = [];
    setAnswer('');      answerRef.current = '';
    stopTimer();
  }

  // ── Derived reveal values ────────────────────────────────────────────────────
  const idx          = chAnswers.length;                            // current (unanswered) challenge
  const allAnswered  = challenges.length > 0 && idx >= challenges.length;
  const correctCount = challenges.reduce((c, p, i) => c + (chAnswers[i] != null && chAnswers[i] === p.answer ? 1 : 0), 0);
  const wrongCount   = challenges.length - correctCount;
  // Half the move's damage is guaranteed; the other half is earned by the math.
  // Each wrong answer forfeits an equal share of that earnable half.
  const guaranteed   = Math.round(baseDmg * 0.5);
  const deduction    = challenges.length ? Math.round((baseDmg - guaranteed) / challenges.length) : 0;
  const finalDamage  = Math.max(guaranteed, baseDmg - wrongCount * deduction);
  const curTimeLimit = challenges[idx]?.timeLimitSeconds ?? DEFAULT_TIME;

  return {
    challenges, chAnswers, answer, setAnswer, timer, baseDmg, isCrit, inpRef,
    idx, allAnswered, correctCount, wrongCount, deduction, finalDamage, curTimeLimit,
    begin, submitTyped, clear, startTimer, stopTimer,
  };
}
