import type { JLPTLevel } from '../types/jlpt'
import { grammarLessonService } from '../services/grammarLessonService'
import { useAsync } from './useAsync'

/** Grammar "studied" progress (studied/total points) for one JLPT level, live from IndexedDB. */
export function useGrammarLevelProgress(level: JLPTLevel) {
  return useAsync(() => grammarLessonService.getLevelProgress(level), [level])
}
