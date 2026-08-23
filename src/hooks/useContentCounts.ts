import type { JLPTLevel } from '../types/jlpt'
import { getQuestionsForLevel } from '../content/contentLoader'
import { grammarLessonService } from '../services/grammarLessonService'
import { useImportedGrammarReady } from './useImportedGrammarReady'

/**
 * Synchronous by design: content files are bundled at build time (see
 * src/content/contentLoader.ts), so there is no async loading state to
 * model here — unlike the IndexedDB-backed hooks in this folder.
 * grammarCount goes through grammarLessonService (not contentLoader
 * directly) so it includes user-imported grammar points once the
 * imported-grammar cache warms; useImportedGrammarReady is what forces
 * the one re-render that picks that up.
 */
export function useContentCounts(level: JLPTLevel) {
  useImportedGrammarReady()
  return {
    grammarCount: grammarLessonService.getGrammarPoints(level).length,
    questionCount: getQuestionsForLevel(level).length,
  }
}
