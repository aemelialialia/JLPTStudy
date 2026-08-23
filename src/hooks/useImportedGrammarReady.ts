import { warmImportedGrammarCache } from '../content/importedGrammarCache'
import { useAsync } from './useAsync'

/**
 * Triggers (idempotently) the imported-grammar cache to warm, and forces
 * one re-render once it resolves — call this from any component that
 * reads grammarLessonService.getGrammarPoints/getGrammarPoint, so a page
 * that mounts before the cache has warmed still picks up imported
 * content without a full page reload. The boolean return value itself
 * isn't the interesting part (grammarLessonService already reads the
 * merged cache internally); this hook exists purely to own the
 * re-render.
 */
export function useImportedGrammarReady(): boolean {
  const { data } = useAsync(() => warmImportedGrammarCache().then(() => true), [])
  return data ?? false
}
