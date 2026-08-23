import type { GrammarImportCommitResult } from '../../types/grammarImport'
import '../vocabulary/vocabulary.css'

/** Renders the already-computed result of a completed grammar import — every number was read back from IndexedDB by grammarImportRepository after the write completed. Mirrors vocabulary's ImportSummary. */
export function GrammarImportSummary({ result, onDone }: { result: GrammarImportCommitResult; onDone: () => void }) {
  return (
    <div className="vocab-card">
      <h3>Import Complete</h3>
      <dl>
        <div className="vocab-detail-row">
          <dt>Level</dt>
          <dd>{result.level}</dd>
        </div>
      </dl>
      <div className="vocab-stat-grid">
        <Stat label="New" value={result.createdCount} />
        <Stat label="Updated" value={result.updatedCount} />
        <Stat label="Unchanged (duplicate)" value={result.unchangedCount} />
        <Stat label="Duplicate rows in file" value={result.duplicateInFileCount} />
        <Stat label="Invalid" value={result.invalidCount} />
        <Stat label={`Total imported ${result.level} grammar`} value={result.totalForLevel} />
      </div>
      <div className="vocab-button-row">
        <button type="button" className="vocab-button vocab-button--primary" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="vocab-card" style={{ margin: 0, padding: 'var(--space-2) var(--space-3)' }}>
      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>{value}</div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{label}</div>
    </div>
  )
}
