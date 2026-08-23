import { useCallback, useState } from 'react'
import type { JLPTLevel } from '../types/jlpt'
import type { ImportCommitResult, ImportPreview } from '../types/vocabularyImport'
import { xlsxImportService } from '../services/xlsxImportService'

export type VocabularyImportState =
  | { phase: 'idle' }
  | { phase: 'previewing'; fileName: string }
  | { phase: 'preview'; preview: ImportPreview }
  | { phase: 'importing'; preview: ImportPreview }
  | { phase: 'result'; result: ImportCommitResult }
  | { phase: 'error'; message: string }

/**
 * Drives the whole "select file -> preview -> confirm -> result" flow
 * (spec section 4/7) as an explicit state machine. Every step that
 * touches XLSX parsing, IndexedDB reads, or IndexedDB writes goes through
 * xlsxImportService — this hook only holds UI state (which phase we're
 * in) and never parses a file or opens IndexedDB itself, so the
 * VocabularyImporter/ImportPreview/ImportSummary components can stay
 * pure presentation and be swapped out later without touching this logic.
 */
export function useVocabularyImport(level: JLPTLevel) {
  const [state, setState] = useState<VocabularyImportState>({ phase: 'idle' })

  const selectFile = useCallback(
    async (file: File) => {
      setState({ phase: 'previewing', fileName: file.name })
      try {
        const preview = await xlsxImportService.buildPreview(file, level)
        setState({ phase: 'preview', preview })
      } catch (err) {
        setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    },
    [level],
  )

  const confirm = useCallback(async () => {
    if (state.phase !== 'preview') return
    const { preview } = state
    setState({ phase: 'importing', preview })
    try {
      const result = await xlsxImportService.commitImport(preview)
      setState({ phase: 'result', result })
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }, [state])

  const cancel = useCallback(() => setState({ phase: 'idle' }), [])
  const reset = useCallback(() => setState({ phase: 'idle' }), [])

  return { state, selectFile, confirm, cancel, reset }
}
