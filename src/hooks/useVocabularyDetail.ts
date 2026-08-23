import { useCallback } from 'react'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { studyStateRepository } from '../data/repositories/studyStateRepository'
import { useAsync } from './useAsync'

/**
 * Data + actions for the vocabulary detail panel, including the Phase 2
 * "Mark Learning / Mark Memorized / Reset Status" test controls (spec
 * section 15). These call the exact same studyStateRepository functions
 * Phase 3's flashcard flow will use — there is no separate test-only
 * status logic to later throw away.
 */
export function useVocabularyDetail(vocabularyId: string | null) {
  const wordState = useAsync(async () => {
    if (!vocabularyId) return null
    const [word, studyState] = await Promise.all([
      vocabularyRepository.getById(vocabularyId),
      studyStateRepository.getOrCreate(vocabularyId),
    ])
    return word ? { word, studyState } : null
  }, [vocabularyId])

  const markLearning = useCallback(async () => {
    if (!vocabularyId) return
    await studyStateRepository.markLearning(vocabularyId)
    wordState.refresh()
  }, [vocabularyId, wordState])

  const markMemorized = useCallback(async () => {
    if (!vocabularyId) return
    await studyStateRepository.markMemorized(vocabularyId)
    wordState.refresh()
  }, [vocabularyId, wordState])

  const resetStatus = useCallback(async () => {
    if (!vocabularyId) return
    await studyStateRepository.resetToNew(vocabularyId)
    wordState.refresh()
  }, [vocabularyId, wordState])

  const deleteWord = useCallback(async () => {
    if (!vocabularyId) return
    await vocabularyRepository.delete(vocabularyId)
  }, [vocabularyId])

  return { ...wordState, markLearning, markMemorized, resetStatus, deleteWord }
}
