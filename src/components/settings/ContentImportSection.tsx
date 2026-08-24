import { useState } from 'react'
import { JLPT_LEVELS } from '../../types/jlpt'
import type { JLPTLevel } from '../../types/jlpt'
import { useVocabularyImport } from '../../hooks/useVocabularyImport'
import { useGrammarImport } from '../../hooks/useGrammarImport'
import { VocabularyImporter } from '../vocabulary/VocabularyImporter'
import { ImportPreview } from '../vocabulary/ImportPreview'
import { ImportSummary } from '../vocabulary/ImportSummary'
import { GrammarImporter } from '../grammar/GrammarImporter'
import { GrammarImportPreview } from '../grammar/GrammarImportPreview'
import { GrammarImportSummary } from '../grammar/GrammarImportSummary'
import '../vocabulary/vocabulary.css'
import '../study/study.css'

type ImportKind = 'vocabulary' | 'grammar'

/**
 * "Import study data" (above this section, in Settings.tsx) is a JSON
 * full-backup restore — a different concept entirely from this section,
 * which is the same per-level .xlsx content import that already exists on
 * the Vocabulary (`/level/:level`) and Grammar (`/grammar/:level`) pages.
 * Added here so people don't have to leave Settings to add vocabulary or
 * grammar points from a spreadsheet. Deliberately reuses those pages'
 * exact hooks/components (`useVocabularyImport`/`useGrammarImport` and
 * their Importer/Preview/Summary trio) rather than re-implementing the
 * select -> preview -> confirm -> result flow a third time — only the
 * kind/level pickers around it are new.
 */
export function ContentImportSection({ onImported }: { onImported: () => void }) {
  const [kind, setKind] = useState<ImportKind>('vocabulary')
  const [level, setLevel] = useState<JLPTLevel>('N5')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <p className="text-body-md" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
        Add vocabulary or grammar points from your own .xlsx spreadsheet. Choose a type and level, then pick a
        file — nothing is saved until you confirm the preview.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          type="button"
          className={'study-btn squish-btn' + (kind === 'vocabulary' ? ' study-btn--primary' : '')}
          onClick={() => setKind('vocabulary')}
        >
          Vocabulary
        </button>
        <button
          type="button"
          className={'study-btn squish-btn' + (kind === 'grammar' ? ' study-btn--primary' : '')}
          onClick={() => setKind('grammar')}
        >
          Grammar
        </button>
      </div>

      <div className="vocab-field" style={{ maxWidth: 200 }}>
        <label htmlFor="settings-import-level">Level</label>
        <select
          id="settings-import-level"
          value={level}
          onChange={(e) => setLevel(e.target.value as JLPTLevel)}
        >
          {JLPT_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Keyed by kind+level so switching either fully remounts the flow —
          each import hook's internal state (idle/preview/importing/etc.)
          is scoped to one (kind, level) pair, exactly like navigating
          between /level/:level or /grammar/:level pages already does. */}
      {kind === 'vocabulary' ? (
        <VocabularyImportFlow key={`vocabulary-${level}`} level={level} onImported={onImported} />
      ) : (
        <GrammarImportFlow key={`grammar-${level}`} level={level} onImported={onImported} />
      )}
    </div>
  )
}

function VocabularyImportFlow({ level, onImported }: { level: JLPTLevel; onImported: () => void }) {
  const flow = useVocabularyImport(level)

  return (
    <div className="vocab-card">
      {flow.state.phase === 'idle' && <VocabularyImporter onFileSelected={flow.selectFile} variant="button" />}
      {flow.state.phase === 'previewing' && <p>Reading {flow.state.fileName}…</p>}
      {flow.state.phase === 'preview' && (
        <ImportPreview preview={flow.state.preview} onConfirm={flow.confirm} onCancel={flow.cancel} />
      )}
      {flow.state.phase === 'importing' && <p>Importing…</p>}
      {flow.state.phase === 'result' && (
        <ImportSummary
          result={flow.state.result}
          onDone={() => {
            flow.reset()
            onImported()
          }}
        />
      )}
      {flow.state.phase === 'error' && (
        <div>
          <p role="alert">{flow.state.message}</p>
          <div className="vocab-button-row">
            <button type="button" className="vocab-button" onClick={flow.reset}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GrammarImportFlow({ level, onImported }: { level: JLPTLevel; onImported: () => void }) {
  const flow = useGrammarImport(level)

  return (
    <div className="vocab-card">
      {flow.state.phase === 'idle' && <GrammarImporter onFileSelected={flow.selectFile} variant="button" />}
      {flow.state.phase === 'previewing' && <p>Reading {flow.state.fileName}…</p>}
      {flow.state.phase === 'preview' && (
        <GrammarImportPreview preview={flow.state.preview} onConfirm={flow.confirm} onCancel={flow.cancel} />
      )}
      {flow.state.phase === 'importing' && <p>Importing…</p>}
      {flow.state.phase === 'result' && (
        <GrammarImportSummary
          result={flow.state.result}
          onDone={() => {
            flow.reset()
            onImported()
          }}
        />
      )}
      {flow.state.phase === 'error' && (
        <div>
          <p role="alert">{flow.state.message}</p>
          <div className="vocab-button-row">
            <button type="button" className="vocab-button" onClick={flow.reset}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
