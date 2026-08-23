import { useState } from 'react'
import type { JLPTLevel } from '../../types/jlpt'
import { useGrammarImport } from '../../hooks/useGrammarImport'
import { GrammarImporter } from './GrammarImporter'
import { GrammarImportPreview } from './GrammarImportPreview'
import { GrammarImportSummary } from './GrammarImportSummary'
import '../vocabulary/vocabulary.css'

/**
 * "Import Grammar" section embedded directly in the Grammar hub for the
 * current level (Phase 5 spec section 8) — collapsed by default so it
 * doesn't compete with the hub's existing browsing/practice content,
 * expands into the exact same select-file -> preview -> confirm -> result
 * flow the vocabulary importer uses. `level` comes from the page's own
 * URL param (the level switcher already at the top of the hub IS the
 * "Select Level" step), so this section itself only ever needs a file
 * picker, mirroring how LevelPage embeds vocabulary import using its own
 * page-level `level`.
 */
export function GrammarImportSection({ level, onImported }: { level: JLPTLevel; onImported: () => void }) {
  const [open, setOpen] = useState(false)
  const importFlow = useGrammarImport(level)

  return (
    <section>
      <div className="grammar-section__header">
        <h2 className="text-title-md">Import Grammar</h2>
        <button type="button" className="vocab-button" onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : 'Import from XLSX'}
        </button>
      </div>
      {open && (
        <div className="vocab-card">
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 0 }}>
            Add your own {level} grammar points from a spreadsheet — columns: Category, Grammar Point, Formation /
            Structure, English Meaning, Core Usage, Minna no Nihongo Lesson(s), New Concept Japanese Coverage,
            Priority, Notes, Mastery. Category, Grammar Point, Formation / Structure, English Meaning, Core Usage,
            and Priority are required; the rest may be left blank. No Level column — the {level} you're viewing now
            is what every imported point gets. The file is read entirely on this device; nothing is uploaded
            anywhere, and nothing is saved until you confirm the preview.
          </p>
          {importFlow.state.phase === 'idle' && <GrammarImporter onFileSelected={importFlow.selectFile} />}
          {importFlow.state.phase === 'previewing' && <p>Reading {importFlow.state.fileName}…</p>}
          {importFlow.state.phase === 'preview' && (
            <GrammarImportPreview preview={importFlow.state.preview} onConfirm={importFlow.confirm} onCancel={importFlow.cancel} />
          )}
          {importFlow.state.phase === 'importing' && <p>Importing…</p>}
          {importFlow.state.phase === 'result' && (
            <GrammarImportSummary
              result={importFlow.state.result}
              onDone={() => {
                importFlow.reset()
                onImported()
              }}
            />
          )}
          {importFlow.state.phase === 'error' && (
            <div>
              <p role="alert">{importFlow.state.message}</p>
              <div className="vocab-button-row">
                <button type="button" className="vocab-button" onClick={importFlow.reset}>
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
