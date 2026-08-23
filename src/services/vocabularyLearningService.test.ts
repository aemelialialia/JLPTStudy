import { describe, it, expect, beforeEach } from 'vitest'
import { vocabularyLearningService } from './vocabularyLearningService'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { studyStateRepository } from '../data/repositories/studyStateRepository'
import type { VocabularyItem } from '../types/vocabulary'

function makeWord(id: string): VocabularyItem {
  return {
    id,
    japanese: id,
    kanji: '',
    kana: id,
    meaning: `meaning-${id}`,
    partOfSpeech: 'noun',
    level: 'N5',
    createdAt: new Date().toISOString(),
  }
}

describe('vocabularyLearningService', () => {
  beforeEach(async () => {
    await vocabularyRepository.addMany(['w1', 'w2', 'w3', 'w4', 'w5'].map(makeWord))
    await studyStateRepository.markMemorized('w1')
  })

  it('excludes memorized words from a study session by default', async () => {
    const session = await vocabularyLearningService.selectStudySession('N5', 10)
    expect(session.map((w) => w.id)).not.toContain('w1')
    expect(session).toHaveLength(4)
  })

  it('includes memorized words when explicitly requested', async () => {
    const session = await vocabularyLearningService.selectStudySession('N5', 10, {
      excludeMemorized: false,
    })
    expect(session).toHaveLength(5)
  })

  it('never returns more than the pool size, even when the requested count is larger', async () => {
    const session = await vocabularyLearningService.selectStudySession('N5', 15, {
      excludeMemorized: false,
    })
    // pool has 5 words total; requesting more than available should just return the pool
    expect(session.length).toBeLessThanOrEqual(5)
  })

  it('reports a level as fully memorized only once every word is memorized', async () => {
    expect(await vocabularyLearningService.isLevelFullyMemorized('N5')).toBe(false)

    for (const id of ['w2', 'w3', 'w4', 'w5']) {
      await studyStateRepository.markMemorized(id)
    }

    expect(await vocabularyLearningService.isLevelFullyMemorized('N5')).toBe(true)
  })

  it('starting a review cycle resets memorized words back into the active pool', async () => {
    await vocabularyLearningService.startReviewCycle('N5')
    const state = await studyStateRepository.get('w1')
    expect(state?.status).toBe('learning')
    expect(state?.dateMemorized).toBeNull()

    const session = await vocabularyLearningService.selectStudySession('N5', 10)
    expect(session.map((w) => w.id)).toContain('w1')
  })

  it('reports level progress counts', async () => {
    const progress = await vocabularyLearningService.getLevelProgress('N5')
    expect(progress).toEqual({ level: 'N5', total: 5, new: 4, learning: 0, memorized: 1 })
  })
})
