import { useRef, useState } from 'react'
import { exportImportService } from '../services/exportImportService'
// Reuses study.css's generic .study-btn button styling rather than
// building a parallel Settings-only button system.
import '../components/study/study.css'

/**
 * Data export/import/clear — reachable from the Profile page ("Manage
 * study data"). The actions are the real local-data-portability pipeline
 * (spec section 18); this page just gives them Stitch-consistent
 * chrome instead of bare unstyled controls.
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
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 className="text-headline-lg">Settings</h1>
        <p className="text-body-md" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
          All study data lives only in this browser's storage — there is no account and nothing is uploaded
          anywhere. Use Export/Import to move data between your devices (e.g. via AirDrop or Files).
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
        <button type="button" className="study-btn study-btn--primary" onClick={handleExport}>
          Export study data
        </button>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }} className="text-title-md">
          Import study data
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportChange} />
        </label>

        <button type="button" className="study-btn" onClick={handleClear}>
          Clear all study data
        </button>
      </div>

      {status && (
        <p role="status" className="text-body-md" style={{ color: 'var(--color-primary)' }}>
          {status}
        </p>
      )}
    </section>
  )
}
