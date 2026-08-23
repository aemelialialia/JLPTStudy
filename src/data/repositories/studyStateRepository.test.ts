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

  it('follows the exact two-stage progression: new -> learning -> memorized on consecutive correct answers', async () => {
    const afterFirst = await studyStateRepository.recordCorrect('w2')
    expect(afterFirst.status).toBe('learning')
    expect(afterFirst.dateMemorized).toBeNull() // a single correct answer is never permanent mastery

    const afterSecond = await studyStateRepository.recordCorrect('w2')
    expect(afterSecond.status).toBe('memorized')
    expect(afterSecond.dateMemorized).not.toBeNull()
    expect(afterSecond.timesSeen).toBe(2)
    expect(afterSecond.timesCorrect).toBe(2)
  })

  it('a new word answered incorrectly still moves to learning (not left as "new")', async () => {
    const state = await studyStateRepository.recordIncorrect('w3')
    expect(state.status).toBe('learning')
    expect(state.timesIncorrect).toBe(1)
    expect(state.timesSeen).toBe(1)
  })

  it('a learning word answered incorrectly stays in learning (never demoted further, history preserved)', async () => {
    await studyStateRepository.recordCorrect('w4') // new -> learning
    const state = await studyStateRepository.recordIncorrect('w4')
    expect(state.status).toBe('learning')
    expect(state.timesSeen).toBe(2)
    expect(state.timesCorrect).toBe(1)
    expect(state.timesIncorrect).toBe(1)
  })

  it('an already-memorized word answered correctly again stays memorized without resetting dateMemorized', async () => {
    await studyStateRepository.recordCorrect('w5') // new -> learning
    await studyStateRepository.recordCorrect('w5') // learning -> memorized
    const memorized = await studyStateRepository.get('w5')

    const state = await studyStateRepository.recordCorrect('w5')
    expect(state.status).toBe('memorized')
    expect(state.dateMemorized).toBe(memorized?.dateMemorized) // unchanged, not re-stamped
    expect(state.timesSeen).toBe(3)
  })

  it('re-opens a memorized word for review without erasing its history (only status/dateMemorized change)', async () => {
    await studyStateRepository.recordCorrect('w1') // new -> learning
    await studyStateRepository.recordCorrect('w1') // learning -> memorized
    const beforeReview = await studyStateRepository.get('w1')

    const reset = await studyStateRepository.resetForReview('w1')
    expect(reset.status).toBe('learning')
    expect(reset.dateMemorized).toBeNull()
    // Everything else is history, not progress-toward-mastery, and must survive a review cycle intact.
    expect(reset.timesSeen).toBe(beforeReview?.timesSeen)
    expect(reset.timesCorrect).toBe(beforeReview?.timesCorrect)
    expect(reset.timesIncorrect).toBe(beforeReview?.timesIncorrect)
    expect(reset.lastReviewed).toBe(beforeReview?.lastReviewed)
  })
})
