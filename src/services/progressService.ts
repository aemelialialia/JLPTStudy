import { studyStateRepository } from '../data/repositories/studyStateRepository'
import { quizRepository } from '../data/repositories/quizRepository'
import { vocabularyLearningService } from './vocabularyLearningService'
import { todayISODate } from '../utils/date'

/**
 * Cross-cutting aggregate stats for the Profile page (and, potentially,
 * a future Dashboard streak badge) — the one place that combines
 * vocabulary and grammar activity, so neither vocabularyLearningService
 * nor grammarLessonService needs to know about the other's data.
 */
export const progressService = {
  /**
   * Today's combined study activity (spec: "Daily Goal... cards studied
   * per day, vocabulary + grammar quiz questions combined") — vocabulary
   * words reviewed today (via studyState.lastReviewed) plus grammar quiz
   * questions answered today (via quizAttempts.timestamp, which records
   * every grammar answer regardless of practice/daily session). Neither
   * source is a separate counter that could drift; both are derived from
   * the real records those actions already write.
   */
  async getTodayActivityCount(): Promise<number> {
    const [vocabularyCount, attempts] = await Promise.all([
      vocabularyLearningService.getTodayReviewedCount(),
      quizRepository.getAttempts(),
    ])
    const today = todayISODate()
    const grammarCount = attempts.filter((a) => a.timestamp.slice(0, 10) === today).length
    return vocabularyCount + grammarCount
  },

  /**
   * Consecutive days (ending today, or yesterday if today has no
   * activity yet) with at least one real study action — a vocabulary
   * word reviewed or a grammar question answered. A simple day-set
   * computation, not a separately-maintained streak counter that could
   * fall out of sync with actual activity.
   */
  async getCurrentStreak(): Promise<number> {
    const [states, attempts] = await Promise.all([studyStateRepository.getAll(), quizRepository.getAttempts()])

    const activeDates = new Set<string>()
    for (const state of states) {
      if (state.lastReviewed) activeDates.add(state.lastReviewed.slice(0, 10))
    }
    for (const attempt of attempts) {
      activeDates.add(attempt.timestamp.slice(0, 10))
    }

    const today = todayISODate()
    const cursor = new Date(`${today}T00:00:00Z`)
    // If today has no activity yet, the streak isn't broken until the day
    // ends — start counting from yesterday instead of reporting 0.
    if (!activeDates.has(today)) {
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }

    let streak = 0
    while (activeDates.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
    return streak
  },
}
