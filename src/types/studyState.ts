/**
 * Mutable, per-word study progress. Kept separate from VocabularyItem
 * (see vocabulary.ts) because this data changes constantly during study
 * sessions while the underlying word content does not, and because a
 * future "reset review cycle" or "re-import" action should be able to
 * touch one without disturbing the other.
 */
export type MemorizationStatus = 'new' | 'learning' | 'memorized'

export interface VocabularyStudyState {
  /** Foreign key -> VocabularyItem.id. Also the IndexedDB key for this store. */
  vocabularyId: string
  status: MemorizationStatus
  timesSeen: number
  timesCorrect: number
  timesIncorrect: number
  /** ISO timestamp of the most recent review, or null if never reviewed. */
  lastReviewed: string | null
  /** ISO timestamp of when the word first reached "memorized", or null. */
  dateMemorized: string | null
}

/** Factory for the initial study state of a freshly-imported word. */
export function createInitialStudyState(vocabularyId: string): VocabularyStudyState {
  return {
    vocabularyId,
    status: 'new',
    timesSeen: 0,
    timesCorrect: 0,
    timesIncorrect: 0,
    lastReviewed: null,
    dateMemorized: null,
  }
}
