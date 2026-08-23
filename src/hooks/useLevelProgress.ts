import type { JLPTLevel } from '../types/jlpt'
import { vocabularyLearningService } from '../services/vocabularyLearningService'
import { useAsync } from './useAsync'

/** Vocabulary progress (new/learning/memorized counts) for one JLPT level, live from IndexedDB. */
export function useLevelProgress(level: JLPTLevel) {
  return useAsync(() => vocabularyLearningService.getLevelProgress(level), [level])
}
