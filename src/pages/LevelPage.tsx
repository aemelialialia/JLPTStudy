import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { isJLPTLevel } from '../types/jlpt'
import type { JLPTLevel } from '../types/jlpt'
import { useLevelProgress } from '../hooks/useLevelProgress'
import { useContentCounts } from '../hooks/useContentCounts'
import { useVocabularyList } from '../hooks/useVocabularyList'
import type { StatusFilter } from '../hooks/useVocabularyList'
import { useVocabularyImport } from '../hooks/useVocabularyImport'
import { useVocabularyDetail } from '../hooks/useVocabularyDetail'
import { StatCard } from '../components/common/StatCard'
import { LevelSelector } from '../components/vocabulary/LevelSelector'
import { VocabularyImporter } from '../components/vocabulary/VocabularyImporter'
import { ImportPreview } from '../components/vocabulary/ImportPreview'
import { ImportSummary } from '../components/vocabulary/ImportSummary'
import { VocabularySearch } from '../components/vocabulary/VocabularySearch'
import { VocabularyFilter } from '../components/vocabulary/VocabularyFilter'
import { VocabularyList } from '../components/vocabulary/VocabularyList'
import { VocabularyDetail } from '../components/vocabulary/VocabularyDetail'

/**
 * One reusable page for all four levels (routed as /level/:level) rather
 * than four separate N5Page/N4Page/N3Page/N2Page components — the level
 * is just data that flows into the same hooks/services. This is the
 * Phase 2 barebone vocabulary management UI: import, search, filter,
 * inspect, and test study-state transitions. Deliberately unstyled
 * beyond the shared design tokens — see src/components/vocabulary/ for
 * the replaceable presentation components this page composes.
 */
export function LevelPage() {
  const { level: levelParam } = useParams<{ level: string }>()
  const navigate = useNavigate()
  const isValidLevel = isJLPTLevel(levelParam)

  // Hooks must run unconditionally on every render (rules-of-hooks), so an
  // invalid :level param falls back to N5 here purely to keep the types
  // happy — its result is simply never rendered when isValidLevel is false.
  const level = isValidLevel ? levelParam : 'N5'

  const { data: progress, refresh: refreshProgress } = useLevelProgress(level)
  const { grammarCount, questionCount } = useContentCounts(level)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const { data: words, refresh: refreshList } = useVocabularyList(level, { search, status })

  const importFlow = useVocabularyImport(level)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detail = useVocabularyDetail(selectedId)

  function handleLevelChange(newLevel: JLPTLevel) {
    setSelectedId(null)
    navigate(`/level/${newLevel}`)
  }

  function refreshAfterDataChange() {
    refreshProgress()
    refreshList()
  }

  if (!isValidLevel) {
    return (
      <section>
        <h1>Unknown level</h1>
        <p>"{levelParam}" is not a recognized JLPT level (expected N5, N4, N3, or N2).</p>
      </section>
    )
  }

  return (
    <section>
      <h1>Vocabulary — {level}</h1>
      <p>
        Barebone testing UI for the vocabulary import/database system. Not the final design — this exists
        to verify the underlying data layer works.
      </p>

      <div className="vocab-toolbar">
        <LevelSelector value={level} onChange={handleLevelChange} />
        <Link to={`/study/${level}`} className="vocab-button vocab-button--primary">
          Study {level}
        </Link>
      </div>

      {progress && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          <StatCard label="Total" value={progress.total} />
          <StatCard label="New" value={progress.new} />
          <StatCard label="Learning" value={progress.learning} />
          <StatCard label="Memorized" value={progress.memorized} />
        </div>
      )}

      <h2>Import vocabulary</h2>
      {importFlow.state.phase === 'idle' && (
        <VocabularyImporter onFileSelected={importFlow.selectFile} />
      )}
      {importFlow.state.phase === 'previewing' && <p>Reading {importFlow.state.fileName}…</p>}
      {importFlow.state.phase === 'preview' && (
        <ImportPreview preview={importFlow.state.preview} onConfirm={importFlow.confirm} onCancel={importFlow.cancel} />
      )}
      {importFlow.state.phase === 'importing' && <p>Importing…</p>}
      {importFlow.state.phase === 'result' && (
        <ImportSummary
          result={importFlow.state.result}
          onDone={() => {
            importFlow.reset()
            refreshAfterDataChange()
          }}
        />
      )}
      {importFlow.state.phase === 'error' && (
        <div className="vocab-card">
          <p role="alert">{importFlow.state.message}</p>
          <div className="vocab-button-row">
            <button type="button" className="vocab-button" onClick={importFlow.reset}>
              Try again
            </button>
          </div>
        </div>
      )}

      <h2>Vocabulary list</h2>
      <div className="vocab-toolbar">
        <VocabularySearch value={search} onChange={setSearch} />
        <VocabularyFilter value={status} onChange={setStatus} />
      </div>
      <p>{words?.length ?? 0} vocabulary item{words?.length === 1 ? '' : 's'}</p>
      <VocabularyList words={words ?? []} onSelect={setSelectedId} />

      {selectedId && detail.data && (
        <VocabularyDetail
          word={detail.data.word}
          studyState={detail.data.studyState}
          onMarkLearning={() => detail.markLearning().then(refreshAfterDataChange)}
          onMarkMemorized={() => detail.markMemorized().then(refreshAfterDataChange)}
          onResetStatus={() => detail.resetStatus().then(refreshAfterDataChange)}
          onDelete={() =>
            detail.deleteWord().then(() => {
              setSelectedId(null)
              refreshAfterDataChange()
            })
          }
          onClose={() => setSelectedId(null)}
        />
      )}

      <h2>Grammar</h2>
      <p>
        {grammarCount} grammar point{grammarCount === 1 ? '' : 's'} curated for {level}. (Phase 3+)
      </p>

      <h2>Quiz</h2>
      <p>{questionCount} question{questionCount === 1 ? '' : 's'} available for {level}. (Phase 3+)</p>
    </section>
  )
}
