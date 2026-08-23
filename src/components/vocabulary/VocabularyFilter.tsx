import type { StatusFilter } from '../../hooks/useVocabularyList'
import './vocabulary.css'

const OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'learning', label: 'Learning' },
  { value: 'memorized', label: 'Memorized' },
]

/** Controlled status filter dropdown. */
export function VocabularyFilter({ value, onChange }: { value: StatusFilter; onChange: (value: StatusFilter) => void }) {
  return (
    <div className="vocab-field">
      <label htmlFor="vocab-status-filter">Status</label>
      <select id="vocab-status-filter" value={value} onChange={(e) => onChange(e.target.value as StatusFilter)}>
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
