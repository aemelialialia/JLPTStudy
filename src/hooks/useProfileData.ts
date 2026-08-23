import { JLPT_LEVELS } from '../types/jlpt'
import { vocabularyLearningService } from '../services/vocabularyLearningService'
import { grammarLessonService } from '../services/grammarLessonService'
import { progressService } from '../services/progressService'
import { useAsync } from './useAsync'

/** Every real number the Profile page shows, fetched together so the page has one loading state. */
export function useProfileData() {
  return useAsync(async () => {
    const [vocabByLevel, grammarByLevel, todayCount, streak] = await Promise.all([
      Promise.all(JLPT_LEVELS.map((level) => vocabularyLearningService.getLevelProgress(level))),
      grammarLessonService.getAllLevelsProgress(),
      progressService.getTodayActivityCount(),
      progressService.getCurrentStreak(),
    ])
    return { vocabByLevel, grammarByLevel, todayCount, streak }
  }, [])
}
