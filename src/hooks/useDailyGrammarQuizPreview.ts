import type { JLPTLevel } from '../types/jlpt'
import { grammarQuizSessionService } from '../services/grammarQuizSessionService'
import { useAsync } from './useAsync'

/** Today's Daily Grammar Quiz session + preview question for one level, live from IndexedDB — for the Dashboard's Daily Grammar Quiz card. */
export function useDailyGrammarQuizPreview(level: JLPTLevel) {
  return useAsync(() => grammarQuizSessionService.getDailyPreview(level), [level])
}
