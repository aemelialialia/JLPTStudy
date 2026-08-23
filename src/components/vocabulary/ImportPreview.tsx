import type { ImportPreview as ImportPreviewData } from '../../types/vocabularyImport'
import './vocabulary.css'

/**
 * Pure presentation of a precomputed ImportPreview — every count and the
 * sample rows were already computed by xlsxImportService.buildPreview();
 * this component only renders them and forwards Cancel/Confirm. Nothing
 * is written to IndexedDB until onConfirm's promise (wired up by the
 * parent via useVocabularyImport) resolves.
 */
export function ImportPreview({
  preview,
  onConfirm,
  onCancel,
  busy,
}: {
  preview: ImportPreviewData
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
            <strong>{preview.errors.length}</strong> row{preview.errors.length === 1 ? '' : 's'} will be
            skipped:
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
                <th>Vocab</th>
                <th>Reading</th>
                <th>Meaning</th>
                <th>Part of Speech</th>
              </tr>
            </thead>
            <tbody>
              {preview.sampleRows.map((row, i) => (
                <tr key={i}>
                  <td>{row.vocab}</td>
                  <td>{row.reading}</td>
                  <td>{row.meaning}</td>
                  <td>{row.partOfSpeech}</td>
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
