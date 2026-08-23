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

/**
 * A "Mistake Book" entry, created when a quiz question is answered
 * incorrectly. Reviewing mistakes updates `reviewCount` / `mastered`
 * without touching the original QuizAttempt history.
 */
export interface MistakeRecord {
  id: string
  questionId: string
  grammarPointId: string
  level: JLPTLevel
  selectedAnswer: string
  correctAnswer: string
  /** ISO timestamp of when the mistake was first recorded. */
  createdAt: string
  /** How many times this mistake has been reviewed in the Mistake Book. */
  reviewCount: number
  /** Whether the user has since answered this question correctly enough to consider it mastered. */
  mastered: boolean
}
