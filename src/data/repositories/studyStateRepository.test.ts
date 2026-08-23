import { describe, it, expect } from 'vitest'
import { studyStateRepository } from './studyStateRepository'

describe('studyStateRepository', () => {
  it('creates a "new" state on first access', async () => {
    const state = await studyStateRepository.getOrCreate('w1')
    expect(state).toMatchObject({ vocabularyId: 'w1', status: 'new', timesSeen: 0 })
  })

  it('promotes new -> learning on a correct answer, and tracks counters', async () => {
    const state = await studyStateRepository.recordCorrect('w1')
    expect(state.status).toBe('learning')
    expect(state.timesSeen).toBe(1)
    expect(state.timesCorrect).toBe(1)
    expect(state.lastReviewed).not.toBeNull()
  })

  it('marks memorized explicitly, and demotes back to learning on a subsequent wrong answer', async () => {
    await studyStateRepository.recordCorrect('w1')
    const memorized = await studyStateRepository.markMemorized('w1')
    expect(memorized.status).toBe('memorized')
    expect(memorized.dateMemorized).not.toBeNull()

    const afterMistake = await studyStateRepository.recordIncorrect('w1')
    expect(afterMistake.status).toBe('learning')
    expect(afterMistake.dateMemorized).toBeNull()
    expect(afterMistake.timesIncorrect).toBe(1)
  })

  it('resets counters and status when starting a new review cycle', async () => {
    await studyStateRepository.recordCorrect('w1')
    await studyStateRepository.markMemorized('w1')

    const reset = await studyStateRepository.resetForReview('w1')
    expect(reset).toEqual({
      vocabularyId: 'w1',
      status: 'learning',
      timesSeen: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      lastReviewed: null,
      dateMemorized: null,
    })
  })
})
