import { useRef, useState } from 'react'
import { exportImportService } from '../services/exportImportService'

/**
 * Placeholder Settings page. The export/import/clear actions are real
 * (they call the actual data layer) but deliberately unstyled — this is
 * about proving the local-data-portability architecture (section 18)
 * works, not about the final Settings UI.
 */
export function Settings() {
  const [status, setStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    <section>
      <h1>Settings</h1>
      <p>Placeholder settings page — verifies the local data export/import/clear pipeline.</p>

      <h2>Study data</h2>
      <p>
        All study data lives only in this browser's IndexedDB — there is no account and nothing is
        uploaded anywhere. Use Export/Import to move data between your iPhone and iPad (e.g. via AirDrop
        or Files).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
        <button type="button" onClick={handleExport}>
          Export study data
        </button>

        <label>
          Import study data
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportChange} />
        </label>

        <button type="button" onClick={handleClear}>
          Clear all study data
        </button>
      </div>

      {status && <p role="status">{status}</p>}
    </section>
  )
}
