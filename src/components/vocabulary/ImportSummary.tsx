import type { ImportCommitResult } from '../../types/vocabularyImport'
import './vocabulary.css'

/**
 * Renders the already-computed result of a completed import. Every
 * number here — including totalForLevel — was read back from IndexedDB
 * by vocabularyRepository.commitImportPlan after the write completed, so
 * this never reports a success the database doesn't actually reflect.
 */
export function ImportSummary({ result, onDone }: { result: ImportCommitResult; onDone: () => void }) {
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
        <Stat label={`Total ${result.level} vocabulary`} value={result.totalForLevel} />
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
