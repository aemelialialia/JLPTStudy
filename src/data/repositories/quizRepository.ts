import { getDB } from '../db'
import type { QuizAttempt, MistakeRecord } from '../../types/quiz'
import { normalizeMistakeRecord } from '../../types/quiz'
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
    const all = await db.getAll('mistakes')
    return all.map(normalizeMistakeRecord)
  },

  async getMistakesByLevel(level: JLPTLevel): Promise<MistakeRecord[]> {
    const db = await getDB()
    const all = await db.getAllFromIndex('mistakes', 'by-level', level)
    return all.map(normalizeMistakeRecord)
  },

  async getMistakeForQuestion(questionId: string): Promise<MistakeRecord | undefined> {
    const db = await getDB()
    const all = await db.getAll('mistakes')
    const found = all.find((m) => m.questionId === questionId)
    return found ? normalizeMistakeRecord(found) : undefined
  },

  /** Every Active (not yet Mastered) mistake, optionally scoped to a level — the pool Mistake Practice sessions draw from. */
  async getActiveMistakes(level?: JLPTLevel): Promise<MistakeRecord[]> {
    const all = level ? await quizRepository.getMistakesByLevel(level) : await quizRepository.getMistakes()
    return all.filter((m) => !m.mastered)
  },
}
