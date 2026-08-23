import type { JLPTLevel } from '../types/jlpt'
import type { GrammarQuestion } from '../types/question'
import type { QuizAttempt, MistakeRecord } from '../types/quiz'
import { MASTERY_STREAK_TARGET } from '../types/quiz'
import { getQuestionsForLevel } from '../content/contentLoader'
import { quizRepository } from '../data/repositories/quizRepository'
import { shuffled } from '../utils/shuffle'
import { nowISO } from '../utils/date'

export interface AnswerResult {
  isCorrect: boolean
  correctAnswer: string
  explanation: string
  grammarPointId: string
  /** True when this WRONG answer was just added to (or refreshed in) the Mistake Book — lets the quiz feedback screen confirm it (Phase 5 spec section 14). Always false for a correct answer. */
  mistakeRecorded: boolean
  /** True when this CORRECT answer just pushed a previously-Active mistake to Mastered (the 3rd consecutive correct answer). Undefined when not applicable. */
  mistakeMastered?: boolean
}

/**
 * Framework-agnostic grammar quiz logic: building a session from the
 * static question bank, validating an answer, and recording the
 * resulting attempt/mistake in IndexedDB. Has no knowledge of any quiz
 * screen component — it operates purely on GrammarQuestion data and
 * plain callbacks/return values.
 */
export const quizService = {
  /** Builds a shuffled quiz session for a level. `count` omitted = every question in the level. */
  startQuizSession(level: JLPTLevel, count?: number): GrammarQuestion[] {
    const all = shuffled(getQuestionsForLevel(level))
    return typeof count === 'number' ? all.slice(0, count) : all
  },

  /**
   * Validates a selected answer, records the attempt, and updates the
   * Mistake Book (Phase 5 spec sections 5-6) — the ONE place this
   * happens, so it runs identically whether the question came from a
   * level quiz, the Daily Grammar Quiz, or a Mistake Practice session.
   *
   * - Wrong answer: creates the mistake record on first miss, or
   *   refreshes the SAME record (keyed by questionId — never a
   *   duplicate) on a repeat miss. `timesWrong`/`lastWrongAt` always
   *   advance; `consecutiveCorrect` resets to 0 and `mastered` resets to
   *   false (Mastered -> Active), even if it was previously mastered.
   * - Correct answer on a question with an existing, still-Active
   *   mistake record: advances `timesCorrect`/`lastCorrectAt`/
   *   `consecutiveCorrect`, and sets `mastered: true` once
   *   `consecutiveCorrect` reaches MASTERY_STREAK_TARGET (3) — the whole
   *   mastery rule, deliberately not spaced repetition. A correct answer
   *   with no existing mistake record, or on an already-mastered one, is
   *   just recorded as a QuizAttempt as usual.
   *
   * No mistake record is ever deleted here — history is permanent.
   */
  async submitAnswer(question: GrammarQuestion, selectedAnswer: string): Promise<AnswerResult> {
    const isCorrect = selectedAnswer === question.correctAnswer
    const now = nowISO()

    const attempt: QuizAttempt = {
      id: crypto.randomUUID(),
      questionId: question.id,
      level: question.level,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      timestamp: now,
    }
    await quizRepository.recordAttempt(attempt)

    const existing = await quizRepository.getMistakeForQuestion(question.id)
    let mistakeMastered: boolean | undefined

    if (!isCorrect) {
      const mistake: MistakeRecord = existing
        ? {
            ...existing,
            selectedAnswer,
            correctAnswer: question.correctAnswer,
            timesWrong: existing.timesWrong + 1,
            lastWrongAt: now,
            consecutiveCorrect: 0,
            mastered: false,
          }
        : {
            id: crypto.randomUUID(),
            questionId: question.id,
            grammarPointId: question.grammarPointId,
            level: question.level,
            selectedAnswer,
            correctAnswer: question.correctAnswer,
            createdAt: now,
            timesWrong: 1,
            lastWrongAt: now,
            timesCorrect: 0,
            lastCorrectAt: null,
            consecutiveCorrect: 0,
            mastered: false,
          }
      await quizRepository.recordMistake(mistake)
    } else if (existing && !existing.mastered) {
      const consecutiveCorrect = existing.consecutiveCorrect + 1
      const mastered = consecutiveCorrect >= MASTERY_STREAK_TARGET
      const mistake: MistakeRecord = {
        ...existing,
        timesCorrect: existing.timesCorrect + 1,
        lastCorrectAt: now,
        consecutiveCorrect,
        mastered,
      }
      await quizRepository.recordMistake(mistake)
      mistakeMastered = mastered
    }

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      grammarPointId: question.grammarPointId,
      mistakeRecorded: !isCorrect,
      mistakeMastered,
    }
  },

  async getMistakes(level?: JLPTLevel): Promise<MistakeRecord[]> {
    return level ? quizRepository.getMistakesByLevel(level) : quizRepository.getMistakes()
  },

  /** Active (not yet Mastered) mistakes for a level — the pool Mistake Practice sessions draw from. */
  async getActiveMistakes(level: JLPTLevel): Promise<MistakeRecord[]> {
    return quizRepository.getActiveMistakes(level)
  },
}
