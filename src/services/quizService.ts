import type { JLPTLevel } from '../types/jlpt'
import type { GrammarQuestion } from '../types/question'
import type { QuizAttempt, MistakeRecord } from '../types/quiz'
import { getQuestionsForLevel } from '../content/contentLoader'
import { quizRepository } from '../data/repositories/quizRepository'

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export interface AnswerResult {
  isCorrect: boolean
  correctAnswer: string
  explanation: string
  grammarPointId: string
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
   * Validates a selected answer, records the attempt, and — when
   * incorrect — creates or refreshes a Mistake Book record. Returns
   * everything the UI needs for immediate feedback (correct answer +
   * explanation), independent of how that feedback is displayed.
   */
  async submitAnswer(question: GrammarQuestion, selectedAnswer: string): Promise<AnswerResult> {
    const isCorrect = selectedAnswer === question.correctAnswer

    const attempt: QuizAttempt = {
      id: crypto.randomUUID(),
      questionId: question.id,
      level: question.level,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      timestamp: new Date().toISOString(),
    }
    await quizRepository.recordAttempt(attempt)

    if (!isCorrect) {
      const existing = await quizRepository.getMistakeForQuestion(question.id)
      const mistake: MistakeRecord = existing
        ? { ...existing, selectedAnswer, mastered: false }
        : {
            id: crypto.randomUUID(),
            questionId: question.id,
            grammarPointId: question.grammarPointId,
            level: question.level,
            selectedAnswer,
            correctAnswer: question.correctAnswer,
            createdAt: new Date().toISOString(),
            reviewCount: 0,
            mastered: false,
          }
      await quizRepository.recordMistake(mistake)
    }

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      grammarPointId: question.grammarPointId,
    }
  },

  async getMistakes(level?: JLPTLevel): Promise<MistakeRecord[]> {
    return level ? quizRepository.getMistakesByLevel(level) : quizRepository.getMistakes()
  },

  /** Call after the user re-answers a mistake correctly during Mistake Book review. */
  async markMistakeMastered(mistakeId: string): Promise<void> {
    await quizRepository.updateMastery(mistakeId, true)
  },

  /** Call after the user re-answers a mistake incorrectly during review — keeps it active. */
  async markMistakeStillIncorrect(mistakeId: string): Promise<void> {
    await quizRepository.updateMastery(mistakeId, false)
  },
}
