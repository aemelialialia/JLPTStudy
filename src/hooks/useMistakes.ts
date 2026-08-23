import type { JLPTLevel } from '../types/jlpt'
import { quizService } from '../services/quizService'
import { useAsync } from './useAsync'

/** Mistake Book entries, optionally filtered to one level. */
export function useMistakes(level?: JLPTLevel) {
  return useAsync(() => quizService.getMistakes(level), [level])
}
