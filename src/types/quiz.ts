import type { JLPTLevel } from './jlpt'

/** A single recorded attempt at answering a GrammarQuestion. */
export interface QuizAttempt {
  id: string
  questionId: string
  level: JLPTLevel
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  /** ISO timestamp of the attempt. */
  timestamp: string
}

/** Correct answers in a row needed (since the most recent wrong answer) before a mistake is considered Mastered (Phase 5 spec: no spaced repetition yet, just this fixed streak rule). */
export const MASTERY_STREAK_TARGET = 3

/**
 * A "Mistake Book" (錯題本) entry — one per distinct GrammarQuestion the
 * user has ever answered incorrectly, keyed by `questionId` so a repeated
 * wrong answer on the same question updates this same record rather than
 * creating a duplicate (Phase 5 spec section 5). Historical counters
 * (`timesWrong`/`timesCorrect`/timestamps) are NEVER decremented or
 * cleared — only `consecutiveCorrect`/`mastered` reset on a fresh mistake,
 * so the record always reflects the question's full history even once
 * mastered.
 *
 * Mastery rule (Phase 5 spec section 6 — deliberately simple, NOT spaced
 * repetition): `consecutiveCorrect` reaching MASTERY_STREAK_TARGET (3)
 * sets `mastered: true` ("Active" -> "Mastered"). Any subsequent wrong
 * answer on that question resets `mastered: false` and
 * `consecutiveCorrect: 0` ("Mastered" -> "Active"), while `timesWrong`/
 * `timesCorrect`/`createdAt` keep accumulating rather than being reset.
 */
export interface MistakeRecord {
  id: string
  questionId: string
  grammarPointId: string
  level: JLPTLevel
  /** The answer selected on the most recent attempt (right or wrong). */
  selectedAnswer: string
  correctAnswer: string
  /** ISO timestamp of when the mistake was first recorded. */
  createdAt: string
  /** Total number of times this question has ever been answered incorrectly. */
  timesWrong: number
  /** ISO timestamp of the most recent incorrect answer. */
  lastWrongAt: string
  /** Total number of times this question has been answered correctly since being added to the Mistake Book. */
  timesCorrect: number
  /** ISO timestamp of the most recent correct answer, or null if never answered correctly since the last mistake. */
  lastCorrectAt: string | null
  /** Correct answers in a row since the most recent wrong answer. Resets to 0 on any wrong answer; reaching MASTERY_STREAK_TARGET sets `mastered: true`. */
  consecutiveCorrect: number
  /** Active (false) = still needs review. Mastered (true) = MASTERY_STREAK_TARGET consecutive correct answers since the last mistake. */
  mastered: boolean
}

/**
 * Fills in Phase 5's new mastery fields for a MistakeRecord that may have
 * been written before this schema existed (this app has no formal
 * IndexedDB field migration — stores are schemaless key/value, so an
 * older record simply lacks these keys at read time). A pre-Phase-5
 * record is treated as: wrong exactly once (its `createdAt`), never yet
 * answered correctly, 0-streak, Active — the most conservative reading of
 * "we don't actually know its full history."
 */
export function normalizeMistakeRecord(raw: MistakeRecord): MistakeRecord {
  return {
    ...raw,
    timesWrong: raw.timesWrong ?? 1,
    lastWrongAt: raw.lastWrongAt ?? raw.createdAt,
    timesCorrect: raw.timesCorrect ?? 0,
    lastCorrectAt: raw.lastCorrectAt ?? null,
    consecutiveCorrect: raw.consecutiveCorrect ?? 0,
    mastered: raw.mastered ?? false,
  }
}
