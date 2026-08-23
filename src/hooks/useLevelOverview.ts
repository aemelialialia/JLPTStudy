import { JLPT_LEVELS } from '../types/jlpt'
import { vocabularyLearningService } from '../services/vocabularyLearningService'
import { grammarLessonService } from '../services/grammarLessonService'
import { useAsync } from './useAsync'

/**
 * Combined vocabulary + grammar progress for every JLPT level, for the
 * /levels "JLPT Level Selection" page — real per-level numbers so the
 * user can see where they stand before picking a target level.
 */
export function useLevelOverview() {
  return useAsync(async () => {
    const [vocabByLevel, grammarByLevel] = await Promise.all([
      Promise.all(JLPT_LEVELS.map((level) => vocabularyLearningService.getLevelProgress(level))),
      grammarLessonService.getAllLevelsProgress(),
    ])
    return { vocabByLevel, grammarByLevel }
  }, [])
}
