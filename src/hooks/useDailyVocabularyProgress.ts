import { vocabularyLearningService } from '../services/vocabularyLearningService'
import { useAsync } from './useAsync'

/** Distinct vocabulary words reviewed today, live from IndexedDB — for the Dashboard's Daily Vocabulary Progress ring. */
export function useDailyVocabularyProgress() {
  return useAsync(() => vocabularyLearningService.getTodayReviewedCount(), [])
}
