import { getDB } from '../db'
import type { GrammarProgress } from '../../types/grammar'
import type { JLPTLevel } from '../../types/jlpt'

/**
 * All reads/writes to the `grammarProgress` IndexedDB store. Grammar
 * point *content* lives in src/content (static, curated); this
 * repository only ever touches the user's own "have I studied this
 * point" interaction history.
 */
export const grammarProgressRepository = {
  async get(grammarPointId: string): Promise<GrammarProgress | undefined> {
    const db = await getDB()
    return db.get('grammarProgress', grammarPointId)
  },

  async getAll(): Promise<GrammarProgress[]> {
    const db = await getDB()
    return db.getAll('grammarProgress')
  },

  async getByLevel(level: JLPTLevel): Promise<GrammarProgress[]> {
    const db = await getDB()
    return db.getAllFromIndex('grammarProgress', 'by-level', level)
  },

  /**
   * Records that a grammar point's lesson was opened. The first call for
   * a given grammarPointId stamps `firstStudiedAt` (what "studied" counts
   * against); every call refreshes `lastStudiedAt`. Upserting by a
   * primary key that IS the grammar point's id is what makes this
   * naturally idempotent — revisiting a lesson never creates a second
   * "studied" record or inflates a count.
   */
  async markStudied(grammarPointId: string, level: JLPTLevel): Promise<GrammarProgress> {
    const db = await getDB()
    const existing = await db.get('grammarProgress', grammarPointId)
    const now = new Date().toISOString()
    const next: GrammarProgress = existing
      ? { ...existing, lastStudiedAt: now }
      : { grammarPointId, level, firstStudiedAt: now, lastStudiedAt: now, timesQuizzed: 0, timesQuizCorrect: 0 }
    await db.put('grammarProgress', next)
    return next
  },

  /** Called after a grammar quiz question tied to this point is answered, win or lose — feeds the Profile's grammar stats without touching the "studied" flag (studied is lesson-interaction only, per spec section 15). */
  async recordQuizResult(grammarPointId: string, level: JLPTLevel, wasCorrect: boolean): Promise<GrammarProgress> {
    const db = await getDB()
    const existing = await db.get('grammarProgress', grammarPointId)
    const now = new Date().toISOString()
    const base: GrammarProgress = existing ?? {
      grammarPointId,
      level,
      firstStudiedAt: now,
      lastStudiedAt: now,
      timesQuizzed: 0,
      timesQuizCorrect: 0,
    }
    const next: GrammarProgress = {
      ...base,
      timesQuizzed: base.timesQuizzed + 1,
      timesQuizCorrect: base.timesQuizCorrect + (wasCorrect ? 1 : 0),
    }
    await db.put('grammarProgress', next)
    return next
  },
}
