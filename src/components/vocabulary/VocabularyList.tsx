import type { VocabularyWithStatus } from '../../data/repositories/vocabularyRepository'
import { VocabularyRow } from './VocabularyRow'
import './vocabulary.css'

/**
 * Receives an already-filtered/searched list (see useVocabularyList) and
 * an onSelect callback — no IndexedDB access, no filtering logic. Just
 * renders rows or an empty state.
 */
export function VocabularyList({
  words,
  onSelect,
}: {
  words: VocabularyWithStatus[]
  onSelect: (id: string) => void
}) {
  if (words.length === 0) {
    return <p className="vocab-empty">No vocabulary matches the current search/filter.</p>
  }

  return (
    <div className="vocab-table-wrap">
      <table className="vocab-table">
        <thead>
          <tr>
            <th>Vocab</th>
            <th>Reading</th>
            <th>Meaning</th>
            <th>Part of Speech</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {words.map((word) => (
            <VocabularyRow key={word.id} word={word} onSelect={onSelect} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
