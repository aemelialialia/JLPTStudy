import type { GrammarImportPreview as GrammarImportPreviewData } from '../../types/grammarImport'
import '../vocabulary/vocabulary.css'

/**
 * Pure presentation of a precomputed GrammarImportPreview — every count
 * and sample row was already computed by grammarXlsxImportService.
 * buildPreview(); this only renders them and forwards Cancel/Confirm.
 * Nothing is written to IndexedDB until onConfirm's promise resolves.
 * Mirrors vocabulary's ImportPreview component field-for-field.
 */
export function GrammarImportPreview({
  preview,
  onConfirm,
  onCancel,
  busy,
}: {
  preview: GrammarImportPreviewData
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}) {
  return (
    <div className="vocab-card">
      <h3>Import Preview</h3>
      <dl>
        <div className="vocab-detail-row">
          <dt>Level</dt>
          <dd>{preview.level}</dd>
        </div>
        <div className="vocab-detail-row">
          <dt>File</dt>
          <dd>{preview.fileName}</dd>
        </div>
      </dl>

      <div className="vocab-stat-grid">
        <StatBox label="Total rows" value={preview.totalRows} />
        <StatBox label="Valid" value={preview.validRowCount} />
        <StatBox label="Invalid" value={preview.invalidRowCount} />
        <StatBox label="Blank (skipped)" value={preview.blankRowsSkipped} />
        <StatBox label="Duplicate in file" value={preview.duplicateInFileCount} />
        <StatBox label="New" value={preview.newCount} />
        <StatBox label="Existing" value={preview.existingCount} />
      </div>

      {preview.errors.length > 0 && (
        <>
          <p>
            <strong>{preview.errors.length}</strong> row{preview.errors.length === 1 ? '' : 's'} will be skipped:
          </p>
          <ul className="vocab-error-list">
            {preview.errors.map((e) => (
              <li key={e.row}>
                Row {e.row}: {e.messages.join(', ')}
              </li>
            ))}
          </ul>
        </>
      )}

      {preview.sampleRows.length > 0 && (
        <div className="vocab-table-wrap">
          <table className="vocab-table">
            <thead>
              <tr>
                <th>Grammar Point</th>
                <th>Meaning</th>
                <th>Formation</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              {preview.sampleRows.map((row, i) => (
                <tr key={i}>
                  <td>{row.grammarPoint}</td>
                  <td>{row.meaning}</td>
                  <td>{row.formation}</td>
                  <td>{row.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {preview.sampleRows.length < preview.validRowCount && (
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          Showing {preview.sampleRows.length} of {preview.validRowCount} valid rows.
        </p>
      )}

      <div className="vocab-button-row">
        <button type="button" className="vocab-button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="vocab-button vocab-button--primary"
          onClick={onConfirm}
          disabled={busy || preview.validRowCount === 0}
        >
          {busy ? 'Importing…' : 'Confirm Import'}
        </button>
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="vocab-card" style={{ margin: 0, padding: 'var(--space-2) var(--space-3)' }}>
      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>{value}</div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{label}</div>
    </div>
  )
}
