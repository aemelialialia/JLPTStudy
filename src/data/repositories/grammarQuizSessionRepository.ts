import { getDB } from '../db'
import type { GrammarQuizSession } from '../../types/grammarQuizSession'
import type { JLPTLevel } from '../../types/jlpt'

/** All reads/writes to the `grammarQuizSessions` IndexedDB store — see GrammarQuizSession for why this exists (session persistence + quiz-context preservation). */
export const grammarQuizSessionRepository = {
  async get(id: string): Promise<GrammarQuizSession | undefined> {
    const db = await getDB()
    return db.get('grammarQuizSessions', id)
  },

  async listByLevel(level: JLPTLevel): Promise<GrammarQuizSession[]> {
    const db = await getDB()
    return db.getAllFromIndex('grammarQuizSessions', 'by-level', level)
  },

  /** The one unfinished session for a level, if any — the basis for "resume this quiz" / same-question-context preservation. */
  async getActiveForLevel(level: JLPTLevel): Promise<GrammarQuizSession | undefined> {
    const sessions = await grammarQuizSessionRepository.listByLevel(level)
    return sessions.find((s) => s.status === 'active')
  },

  async create(session: GrammarQuizSession): Promise<void> {
    const db = await getDB()
    await db.add('grammarQuizSessions', session)
  },

  async update(session: GrammarQuizSession): Promise<void> {
    const db = await getDB()
    await db.put('grammarQuizSessions', session)
  },
}
