import type { VocabularyItem } from '../../types/vocabulary'
import type { VocabularyStudyState } from '../../types/studyState'
import './vocabulary.css'

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—'
}

/**
 * Read-only vocabulary fields plus the Phase 2 study-state test controls
 * (spec section 14/15). Receives data and action callbacks only — the
 * buttons call back up to the parent, which (via useVocabularyDetail)
 * invokes the same studyStateRepository functions Phase 3 will use.
 * Nothing here talks to IndexedDB directly.
 */
export function VocabularyDetail({
  word,
  studyState,
  onMarkLearning,
  onMarkMemorized,
  onResetStatus,
  onDelete,
  onClose,
}: {
  word: VocabularyItem
  studyState: VocabularyStudyState
  onMarkLearning: () => void
  onMarkMemorized: () => void
  onResetStatus: () => void
  onDelete: () => void
  onClose: () => void
}) {
  return (
    <div className="vocab-card">
      <h3 lang="ja">{word.vocab}</h3>
      <dl>
        <div className="vocab-detail-row">
          <dt>Reading</dt>
          <dd lang="ja">{word.reading}</dd>
        </div>
        <div className="vocab-detail-row">
          <dt>Meaning</dt>
          <dd>{word.meaning}</dd>
        </div>
        <div className="vocab-detail-row">
          <dt>Part of Speech</dt>
          <dd>{word.partOfSpeech}</dd>
        </div>
        <div className="vocab-detail-row">
          <dt>Level</dt>
          <dd>{word.level}</dd>
        </div>
        <div className="vocab-detail-row">
          <dt>Status</dt>
          <dd>{studyState.status}</dd>
        </div>
      </dl>

      <h4>Study state (for testing — Phase 3 builds the real flashcard flow on this)</h4>
      <dl>
        <div className="vocab-detail-row">
          <dt>Times seen</dt>
          <dd>{studyState.timesSeen}</dd>
        </div>
        <div className="vocab-detail-row">
          <dt>Times correct</dt>
          <dd>{studyState.timesCorrect}</dd>
        </div>
        <div className="vocab-detail-row">
          <dt>Times incorrect</dt>
          <dd>{studyState.timesIncorrect}</dd>
        </div>
        <div className="vocab-detail-row">
          <dt>Last reviewed</dt>
          <dd>{formatDate(studyState.lastReviewed)}</dd>
        </div>
        <div className="vocab-detail-row">
          <dt>Date memorized</dt>
          <dd>{formatDate(studyState.dateMemorized)}</dd>
        </div>
      </dl>

      <div className="vocab-button-row">
        <button type="button" className="vocab-button" onClick={onMarkLearning}>
          Mark Learning
        </button>
        <button type="button" className="vocab-button" onClick={onMarkMemorized}>
          Mark Memorized
        </button>
        <button type="button" className="vocab-button" onClick={onResetStatus}>
          Reset Status
        </button>
      </div>
      <div className="vocab-button-row">
        <button type="button" className="vocab-button" onClick={onClose}>
          Close
        </button>
        <button type="button" className="vocab-button vocab-button--danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  )
}
