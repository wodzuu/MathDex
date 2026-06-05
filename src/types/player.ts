import type { MathTopic } from './math';

// ── Accuracy tracking ─────────────────────────────────────────────────────────

export interface TopicAccuracy {
  correct: number;
  total: number;
}

// ── Trainer Card ──────────────────────────────────────────────────────────────

/**
 * Personal progress dashboard shown on the Trainer Card screen.
 * Also feeds the parent/teacher analytics dashboard. Spec §7.4 and §11.6.
 *
 * Stored inside SaveState and synced to Dexie on every save.
 */
export interface TrainerCard {
  totalCorrectAnswers: number;
  longestStreak: number;
  currentStreak: number;
  bossRoomsCleared: number;
  pokemonCaught: number;
  highestFloorReached: number;
  /** Per-topic accuracy — used for teacher/parent analytics dashboard. */
  accuracyByTopic: Partial<Record<MathTopic, TopicAccuracy>>;
  /** Total item slots unlocked across all party members. */
  itemSlotsUnlockedCount: number;
  /** ISO 8601 timestamp. Set once and never reset. Spec §5.0. */
  itemSystemActivatedAt?: string;
}

// ── Difficulty settings ───────────────────────────────────────────────────────
// Spec §9.3

export type DifficultyMode = 'Explorer' | 'Trainer' | 'Champion';

export interface DifficultyConfig {
  mode: DifficultyMode;
  /** Battle puzzle countdown in seconds. */
  battleTimerSeconds: number;
  /**
   * Fraction of move power applied on incorrect/expired answer.
   * Correct = 1.0. Incorrect: Explorer=0.80, Trainer=0.75, Champion=0.65.
   * Spec §3.3: no answer ever produces a zero result.
   */
  partialCreditMultiplier: number;
  /** Pokédollars charged per hint in identification. 0 = free. */
  hintCostPokeDollars: number;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyMode, DifficultyConfig> = {
  Explorer: {
    mode: 'Explorer',
    battleTimerSeconds: 10,
    partialCreditMultiplier: 0.8,
    hintCostPokeDollars: 0,
  },
  Trainer: {
    mode: 'Trainer',
    battleTimerSeconds: 6,
    partialCreditMultiplier: 0.75,
    hintCostPokeDollars: 0,
  },
  Champion: {
    mode: 'Champion',
    battleTimerSeconds: 4,
    partialCreditMultiplier: 0.65,
    hintCostPokeDollars: 100,
  },
};
