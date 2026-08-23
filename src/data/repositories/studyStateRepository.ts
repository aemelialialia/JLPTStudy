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

  /**
   * Records a correct answer and advances status per the Phase 3
   * two-stage memorization rule (spec sections 9/10):
   *   new -> learning (a single correct answer is never permanent mastery)
   *   learning -> memorized (a *second* stage of correct answers is required)
   *   memorized -> memorized (already there; no change)
   */
  async recordCorrect(vocabularyId: string): Promise<VocabularyStudyState> {
    const state = await studyStateRepository.getOrCreate(vocabularyId)
    const nextStatus: MemorizationStatus = state.status === 'new' ? 'learning' : 'memorized'
    const updated: VocabularyStudyState = {
      ...state,
      timesSeen: state.timesSeen + 1,
      timesCorrect: state.timesCorrect + 1,
      lastReviewed: nowISO(),
      status: nextStatus,
      dateMemorized: nextStatus === 'memorized' && state.status !== 'memorized' ? nowISO() : state.dateMemorized,
    }
    await studyStateRepository.upsert(updated)
    return updated
  },

  /**
   * Records an incorrect answer per the same rule set — every status lands
   * on "learning" after a miss:
   *   new -> learning (a miss still means "now being actively learned")
   *   learning -> learning (stays in the pool, no further demotion possible)
   *   memorized -> learning (recovers a word the user thought they knew —
   *   spec section 9's explicit "memorized -> learning" recovery path)
   * History (timesSeen/timesCorrect/timesIncorrect/lastReviewed) is never
   * reset by this — only dateMemorized clears when demoted out of memorized.
   */
  async recordIncorrect(vocabularyId: string): Promise<VocabularyStudyState> {
    const state = await studyStateRepository.getOrCreate(vocabularyId)
    const updated: VocabularyStudyState = {
      ...state,
      timesSeen: state.timesSeen + 1,
      timesIncorrect: state.timesIncorrect + 1,
      lastReviewed: nowISO(),
      status: 'learning',
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

  /**
   * Explicitly sets status to "learning" without touching counters/dates —
   * a direct status-only transition (unlike `recordCorrect`, which only
   * *promotes* new -> learning as a side effect of an answer). Exposed as
   * a Phase 2 test control ("Mark Learning") and reusable by Phase 3.
   */
  async markLearning(vocabularyId: string): Promise<VocabularyStudyState> {
    const state = await studyStateRepository.getOrCreate(vocabularyId)
    const updated: VocabularyStudyState = { ...state, status: 'learning' }
    await studyStateRepository.upsert(updated)
    return updated
  },

  /**
   * Moves a memorized word back into "learning" to start a review cycle
   * (Phase 3 spec section 16). Unlike a full reset, this deliberately
   * preserves timesSeen/timesCorrect/timesIncorrect/lastReviewed — the
   * spec is explicit that a review cycle must not erase historical
   * statistics, only re-open the word for further practice. Only
   * dateMemorized clears, since the word is no longer (currently)
   * memorized — consistent with how recordIncorrect demotes a word.
   */
  async resetForReview(vocabularyId: string): Promise<VocabularyStudyState> {
    const state = await studyStateRepository.getOrCreate(vocabularyId)
    const updated: VocabularyStudyState = {
      ...state,
      status: 'learning',
      dateMemorized: null,
    }
    await studyStateRepository.upsert(updated)
    return updated
  },

  /** Full reset back to "new" with fresh counters — the Phase 2 "Reset Status" test control. */
  async resetToNew(vocabularyId: string): Promise<VocabularyStudyState> {
    const updated = createInitialStudyState(vocabularyId)
    await studyStateRepository.upsert(updated)
    return updated
  },
}
