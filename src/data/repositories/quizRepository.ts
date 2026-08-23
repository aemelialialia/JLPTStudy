import { getDB } from '../db'
import type { QuizAttempt, MistakeRecord } from '../../types/quiz'
import type { JLPTLevel } from '../../types/jlpt'

/**
 * All reads/writes to the `quizAttempts` and `mistakes` IndexedDB stores.
 * Quiz question *content* lives in src/content (static, curated); this
 * repository only ever touches the user's own attempt/mistake history.
 */
export const quizRepository = {
  async recordAttempt(attempt: QuizAttempt): Promise<void> {
    const db = await getDB()
    await db.put('quizAttempts', attempt)
  },

  async getAttempts(): Promise<QuizAttempt[]> {
    const db = await getDB()
    return db.getAll('quizAttempts')
  },

  async getAttemptsByLevel(level: JLPTLevel): Promise<QuizAttempt[]> {
    const db = await getDB()
    return db.getAllFromIndex('quizAttempts', 'by-level', level)
  },

  async getAttemptsForQuestion(questionId: string): Promise<QuizAttempt[]> {
    const db = await getDB()
    return db.getAllFromIndex('quizAttempts', 'by-question', questionId)
  },

  async recordMistake(mistake: MistakeRecord): Promise<void> {
    const db = await getDB()
    await db.put('mistakes', mistake)
  },

  async getMistakes(): Promise<MistakeRecord[]> {
    const db = await getDB()
    return db.getAll('mistakes')
  },

  async getMistakesByLevel(level: JLPTLevel): Promise<MistakeRecord[]> {
    const db = await getDB()
    return db.getAllFromIndex('mistakes', 'by-level', level)
  },

  async getMistakeForQuestion(questionId: string): Promise<MistakeRecord | undefined> {
    const all = await quizRepository.getMistakes()
    return all.find((m) => m.questionId === questionId)
  },

  /**
   * Updates (or creates) the mastery state for a mistake. Called with
   * `mastered: true` once the user has since answered the question
   * correctly enough times to consider it resolved.
   */
  async updateMastery(id: string, mastered: boolean): Promise<void> {
    const db = await getDB()
    const existing = await db.get('mistakes', id)
    if (!existing) return
    await db.put('mistakes', {
      ...existing,
      mastered,
      reviewCount: existing.reviewCount + 1,
    })
  },

  async deleteMistake(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('mistakes', id)
  },
}
