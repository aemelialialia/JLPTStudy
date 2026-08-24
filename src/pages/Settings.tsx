import { useRef, useState } from 'react'
import { exportImportService } from '../services/exportImportService'
import { useImportedFiles } from '../hooks/useImportedFiles'
// Reuses study.css's generic .study-btn button styling rather than
// building a parallel Settings-only button system.
import '../components/study/study.css'

const KIND_LABEL: Record<'vocabulary' | 'grammar', string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
}

/**
 * Data export/import/clear — reachable from the Profile page ("Manage
 * study data"). The actions are the real local-data-portability pipeline
 * (spec section 18); this page just gives them Stitch-consistent
 * chrome instead of bare unstyled controls.
 */
export function Settings() {
  const [status, setStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: importedFiles, refresh: refreshImportedFiles } = useImportedFiles()

  async function handleExport() {
    setStatus('Exporting…')
    try {
      await exportImportService.downloadExport()
      setStatus('Export downloaded.')
    } catch (err) {
      setStatus(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handleImportChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setStatus('Importing…')
    try {
      await exportImportService.importFromFile(file)
      setStatus('Import complete.')
      // A restored export can carry vocabulary/grammar imported on
      // another device, but doesn't touch the importedFiles store itself
      // (it's a different kind of import — see useImportedFiles' own
      // doc comment) — refreshing here is cheap and keeps this page
      // honest either way.
      refreshImportedFiles()
    } catch (err) {
      setStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      event.target.value = ''
    }
  }

  async function handleClear() {
    const confirmed = window.confirm(
      'This clears all imported vocabulary, study progress, quiz history, and mistakes on this device. Continue?',
    )
    if (!confirmed) return
    setStatus('Clearing…')
    await exportImportService.clearAllData()
    setStatus('All study data cleared.')
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 className="text-headline-lg">Settings</h1>
        <p className="text-body-md" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
          All study data lives only in this browser's storage — there is no account and nothing is uploaded
          anywhere. Use Export/Import to move data between your devices (e.g. via AirDrop or Files).
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
        <button type="button" className="study-btn study-btn--primary squish-btn" onClick={handleExport}>
          Export study data
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
          <span className="text-title-md">Import study data</span>
          <label htmlFor="settings-import-file-input" className="study-btn squish-btn settings-file-btn">
            Choose File
          </label>
          <input
            ref={fileInputRef}
            id="settings-import-file-input"
            type="file"
            accept="application/json"
            onChange={handleImportChange}
            className="settings-file-input"
          />
        </div>

        <button type="button" className="study-btn squish-btn" onClick={handleClear}>
          Clear all study data
        </button>
      </div>

      {status && (
        <p role="status" className="text-body-md" style={{ color: 'var(--color-primary)' }}>
          {status}
        </p>
      )}

      <div>
        <h2 className="text-title-md" style={{ margin: '0 0 var(--space-3)' }}>
          Uploaded Files
        </h2>
        {importedFiles && importedFiles.length > 0 ? (
          <ul className="settings-file-list">
            {importedFiles.map((file) => (
              <li key={file.id} className="settings-file-list__item">
                <span className="material-symbols-outlined settings-file-list__icon" aria-hidden="true">
                  description
                </span>
                <span className="settings-file-list__name">{file.fileName}</span>
                <span className="settings-file-list__meta">
                  {file.level} {KIND_LABEL[file.kind]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="study-banner" style={{ padding: 'var(--space-6)' }}>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              No files uploaded yet. Vocabulary and grammar XLSX imports will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
