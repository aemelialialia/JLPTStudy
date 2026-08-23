import { getDB } from '../db'
import type { StudySession } from '../../types/studySession'
import type { JLPTLevel } from '../../types/jlpt'

/**
 * All reads/writes to the `studySessions` IndexedDB store. Like every
 * other repository, this is the only module allowed to open a transaction
 * against this store — studySessionService (and, through it, the study
 * UI) always goes through here rather than touching IndexedDB directly.
 */
export const studySessionRepository = {
  async get(id: string): Promise<StudySession | undefined> {
    const db = await getDB()
    return db.get('studySessions', id)
  },

  async listByLevel(level: JLPTLevel): Promise<StudySession[]> {
    const db = await getDB()
    return db.getAllFromIndex('studySessions', 'by-level', level)
  },

  /**
   * The one unfinished session for a level, if any — this is what powers
   * the "you have an unfinished session, Continue or Start New" prompt
   * (spec section 17). Only one session is ever 'active' per level at a
   * time (studySessionService enforces this by abandoning any prior
   * active session before creating a new one), so returning the first
   * match found is unambiguous.
   */
  async getActiveForLevel(level: JLPTLevel): Promise<StudySession | undefined> {
    const sessions = await studySessionRepository.listByLevel(level)
    return sessions.find((s) => s.status === 'active')
  },

  async create(session: StudySession): Promise<void> {
    const db = await getDB()
    await db.add('studySessions', session)
  },

  async update(session: StudySession): Promise<void> {
    const db = await getDB()
    await db.put('studySessions', session)
  },
}
