import { getDB } from '../db'
import type { VocabularyStudyState, MemorizationStatus } from '../../types/studyState'
import { createInitialStudyState } from '../../types/studyState'

const nowISO = () => new Date().toISOString()

/**
 * All reads/writes to the `studyState` IndexedDB store (per-word
 * memorization progress). Kept separate from vocabularyRepository so the
 * vocabulary learning service can evolve review/scoring rules without
 * that logic leaking into how words themselves are stored.
 */
export const studyStateRepository = {
  async getAll(): Promise<VocabularyStudyState[]> {
    const db = await getDB()
    return db.getAll('studyState')
  },

  async get(vocabularyId: string): Promise<VocabularyStudyState | undefined> {
    const db = await getDB()
    return db.get('studyState', vocabularyId)
  },

  /** Returns the existing state, or creates+persists a fresh "new" one. */
  async getOrCreate(vocabularyId: string): Promise<VocabularyStudyState> {
    const existing = await studyStateRepository.get(vocabularyId)
    if (existing) return existing
    const initial = createInitialStudyState(vocabularyId)
    await studyStateRepository.upsert(initial)
    return initial
  },

  async upsert(state: VocabularyStudyState): Promise<void> {
    const db = await getDB()
    await db.put('studyState', state)
  },

  async delete(vocabularyId: string): Promise<void> {
    const db = await getDB()
    await db.delete('studyState', vocabularyId)
  },

  async getByStatus(status: MemorizationStatus): Promise<VocabularyStudyState[]> {
    const db = await getDB()
    return db.getAllFromIndex('studyState', 'by-status', status)
  },

  /** Records a correct answer: increments counters and may promote status. */
  async recordCorrect(vocabularyId: string): Promise<VocabularyStudyState> {
    const state = await studyStateRepository.getOrCreate(vocabularyId)
    const updated: VocabularyStudyState = {
      ...state,
      timesSeen: state.timesSeen + 1,
      timesCorrect: state.timesCorrect + 1,
      lastReviewed: nowISO(),
      status: state.status === 'new' ? 'learning' : state.status,
    }
    await studyStateRepository.upsert(updated)
    return updated
  },

  /** Records an incorrect answer: increments counters, demotes out of "memorized" if needed. */
  async recordIncorrect(vocabularyId: string): Promise<VocabularyStudyState> {
    const state = await studyStateRepository.getOrCreate(vocabularyId)
    const updated: VocabularyStudyState = {
      ...state,
      timesSeen: state.timesSeen + 1,
      timesIncorrect: state.timesIncorrect + 1,
      lastReviewed: nowISO(),
      status: state.status === 'memorized' ? 'learning' : state.status,
      dateMemorized: state.status === 'memorized' ? null : state.dateMemorized,
    }
    await studyStateRepository.upsert(updated)
    return updated
  },

  async markMemorized(vocabularyId: string): Promise<VocabularyStudyState> {
    const state = await studyStateRepository.getOrCreate(vocabularyId)
    const updated: VocabularyStudyState = {
      ...state,
      status: 'memorized',
      dateMemorized: nowISO(),
    }
    await studyStateRepository.upsert(updated)
    return updated
  },

  /** Resets a word back to "learning" with fresh counters — starts a new review cycle for it. */
  async resetForReview(vocabularyId: string): Promise<VocabularyStudyState> {
    const updated: VocabularyStudyState = {
      vocabularyId,
      status: 'learning',
      timesSeen: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      lastReviewed: null,
      dateMemorized: null,
    }
    await studyStateRepository.upsert(updated)
    return updated
  },
}
