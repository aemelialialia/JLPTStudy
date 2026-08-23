import { useCallback, useState } from 'react'
import type { JLPTLevel } from '../types/jlpt'
import type { GrammarImportCommitResult, GrammarImportPreview } from '../types/grammarImport'
import { grammarXlsxImportService } from '../services/grammarXlsxImportService'

export type GrammarImportState =
  | { phase: 'idle' }
  | { phase: 'previewing'; fileName: string }
  | { phase: 'preview'; preview: GrammarImportPreview }
  | { phase: 'importing'; preview: GrammarImportPreview }
  | { phase: 'result'; result: GrammarImportCommitResult }
  | { phase: 'error'; message: string }

/**
 * Drives "select file -> preview -> confirm -> result" for grammar XLSX
 * imports (Phase 5 spec section 8) — the exact same state-machine shape
 * as useVocabularyImport, so the two importers behave identically from
 * the user's perspective even though they're independent hooks over
 * independent services/stores. Every parse/validate/write step goes
 * through grammarXlsxImportService; this hook only owns which phase the
 * flow is in.
 */
export function useGrammarImport(level: JLPTLevel) {
  const [state, setState] = useState<GrammarImportState>({ phase: 'idle' })

  const selectFile = useCallback(
    async (file: File) => {
      setState({ phase: 'previewing', fileName: file.name })
      try {
        const preview = await grammarXlsxImportService.buildPreview(file, level)
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
      const result = await grammarXlsxImportService.commitImport(preview)
      setState({ phase: 'result', result })
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }, [state])

  const cancel = useCallback(() => setState({ phase: 'idle' }), [])
  const reset = useCallback(() => setState({ phase: 'idle' }), [])

  return { state, selectFile, confirm, cancel, reset }
}
