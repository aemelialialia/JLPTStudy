import type { VocabularyWithStatus } from '../../data/repositories/vocabularyRepository'
import './vocabulary.css'

function statusBadgeClass(status: string): string {
  if (status === 'memorized') return 'vocab-status-badge vocab-status-badge--memorized'
  if (status === 'learning') return 'vocab-status-badge vocab-status-badge--learning'
  return 'vocab-status-badge'
}

/** One row: receives the word (with joined status) and a click handler. No data fetching, no logic. */
export function VocabularyRow({ word, onSelect }: { word: VocabularyWithStatus; onSelect: (id: string) => void }) {
  return (
    <tr
      onClick={() => onSelect(word.id)}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${word.vocab}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(word.id)
        }
      }}
    >
      <td lang="ja">{word.vocab}</td>
      <td lang="ja">{word.reading}</td>
      <td>{word.meaning}</td>
      <td>{word.partOfSpeech}</td>
      <td>
        <span className={statusBadgeClass(word.status)}>{word.status}</span>
      </td>
    </tr>
  )
}
