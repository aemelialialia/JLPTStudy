import type { JLPTLevel } from '../types/jlpt'
import type { MemorizationStatus } from '../types/studyState'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { useAsync } from './useAsync'

export type StatusFilter = MemorizationStatus | 'all'

export interface VocabularyListFilters {
  search: string
  status: StatusFilter
}

/**
 * The one query the vocabulary management list screen needs: words for a
 * level, joined with their study status, filtered by search text and/or
 * status. All of the join/filter logic lives in
 * vocabularyRepository.listWithStatus — this hook is just the React
 * wiring (loading state + a refresh() to call after an import/delete/
 * status change).
 */
export function useVocabularyList(level: JLPTLevel, filters: VocabularyListFilters) {
  return useAsync(
    () => vocabularyRepository.listWithStatus(level, filters),
    [level, filters.search, filters.status],
  )
}
