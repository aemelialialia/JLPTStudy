// Reuses the vocabulary manager's own field/toolbar styling verbatim
// (same "mirror the existing UX, don't invent a new one" principle
// already used by the grammar XLSX importer) rather than a bespoke
// filter bar.
import '../vocabulary/vocabulary.css'

/**
 * Search + Priority filter for the full "N5 Grammar Points" browse list
 * (spec: "Grammar Filtering and Search" — data model should support
 * filtering by Category/Priority/Mastery/lesson cross-references, but
 * "do not implement every advanced filtering UI unless it fits naturally
 * in the existing application"). Search and Priority are the two that fit
 * naturally into the existing browse list without adding a whole filter
 * panel; the rest of the fields (Category, Minna no Nihongo, New Concept
 * Japanese, source Mastery) are still fully present on GrammarEntry and
 * shown on each point's card/lesson page, just not filterable here yet.
 */
export function GrammarPointFilters({
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  priorityOptions,
}: {
  search: string
  onSearchChange: (value: string) => void
  priority: string
  onPriorityChange: (value: string) => void
  priorityOptions: string[]
}) {
  return (
    <div className="vocab-toolbar">
      <div className="vocab-field">
        <label htmlFor="grammar-point-search">Search</label>
        <input
          id="grammar-point-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Grammar point, meaning, usage, notes…"
        />
      </div>
      {priorityOptions.length > 0 && (
        <div className="vocab-field">
          <label htmlFor="grammar-point-priority-filter">Priority</label>
          <select id="grammar-point-priority-filter" value={priority} onChange={(e) => onPriorityChange(e.target.value)}>
            <option value="all">All priorities</option>
            {priorityOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
