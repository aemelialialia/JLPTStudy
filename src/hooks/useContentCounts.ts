import type { JLPTLevel } from '../types/jlpt'
import { getGrammarForLevel, getQuestionsForLevel } from '../content/contentLoader'

/**
 * Synchronous by design: content files are bundled at build time (see
 * src/content/contentLoader.ts), so there is no async loading state to
 * model here — unlike the IndexedDB-backed hooks in this folder.
 */
export function useContentCounts(level: JLPTLevel) {
  return {
    grammarCount: getGrammarForLevel(level).length,
    questionCount: getQuestionsForLevel(level).length,
  }
}
