import './vocabulary.css'

/** Controlled search input. No debouncing/filtering logic here — that's the repository's job. */
export function VocabularySearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="vocab-field">
      <label htmlFor="vocab-search">Search</label>
      <input
        id="vocab-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Vocab, reading, meaning…"
      />
    </div>
  )
}
