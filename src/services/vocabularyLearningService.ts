import type { JLPTLevel } from '../types/jlpt'
import type { VocabularyItem } from '../types/vocabulary'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { studyStateRepository } from '../data/repositories/studyStateRepository'

export type SessionSize = 10 | 15 | 20

export interface LevelProgressSummary {
  level: JLPTLevel
  total: number
  new: number
  learning: number
  memorized: number
}

/**
 * Framework-agnostic vocabulary study logic: which words go into a
 * session, how progress is recorded, and when a level counts as "done".
 * Deliberately has no knowledge of any flashcard component or UI — it
 * only deals with VocabularyItem/VocabularyStudyState data and callbacks,
 * so the eventual Stitch flashcard UI can call straight into it.
 */
export const vocabularyLearningService = {
  /**
   * Builds a study session: `count` words from `level`, chosen at random,
   * excluding already-memorized words by default. If fewer than `count`
   * eligible words exist, returns as many as are available. This is
   * exactly the "get N random level vocabulary where status != memorized"
   * operation Phase 3's flashcard session builder needs — the random
   * selection itself lives in vocabularyRepository.getRandomCandidates,
   * this just forwards to it with session-appropriate defaults.
   */
  async selectStudySession(
    level: JLPTLevel,
    count: SessionSize,
    options: { excludeMemorized?: boolean } = {},
  ): Promise<VocabularyItem[]> {
    return vocabularyRepository.getRandomCandidates(level, count, options)
  },

  /** Records the outcome of showing one word once during a session. */
  async recordAnswer(vocabularyId: string, wasCorrect: boolean): Promise<void> {
    if (wasCorrect) {
      await studyStateRepository.recordCorrect(vocabularyId)
    } else {
      await studyStateRepository.recordIncorrect(vocabularyId)
    }
  },

  /** Explicitly marks a word as memorized (e.g. a "I know this" action). */
  async markMemorized(vocabularyId: string): Promise<void> {
    await studyStateRepository.markMemorized(vocabularyId)
  },

  /** True once every imported word in a level has been memorized (and at least one word exists). */
  async isLevelFullyMemorized(level: JLPTLevel): Promise<boolean> {
    const summary = await vocabularyLearningService.getLevelProgress(level)
    return summary.total > 0 && summary.memorized === summary.total
  },

  /**
   * Starts a new review cycle for a level: every memorized word in that
   * level is reset back to "learning" with fresh counters, so it re-enters
   * the active study pool. Words already in "new"/"learning" are untouched.
   */
  async startReviewCycle(level: JLPTLevel): Promise<void> {
    const words = await vocabularyRepository.getByLevel(level)
    const states = await studyStateRepository.getAll()
    const statusById = new Map(states.map((s) => [s.vocabularyId, s.status]))
    const memorizedWords = words.filter((w) => statusById.get(w.id) === 'memorized')
    await Promise.all(memorizedWords.map((w) => studyStateRepository.resetForReview(w.id)))
  },

  /** Counts of new/learning/memorized words for a level — building block for a future dashboard. */
  async getLevelProgress(level: JLPTLevel): Promise<LevelProgressSummary> {
    const words = await vocabularyRepository.getByLevel(level)
    const states = await studyStateRepository.getAll()
    const statusById = new Map(states.map((s) => [s.vocabularyId, s.status]))

    const summary: LevelProgressSummary = { level, total: words.length, new: 0, learning: 0, memorized: 0 }
    for (const word of words) {
      const status = statusById.get(word.id) ?? 'new'
      summary[status] += 1
    }
    return summary
  },
}
