import { describe, it, expect } from 'vitest'
import { vocabularyRepository } from './vocabularyRepository'
import { studyStateRepository } from './studyStateRepository'
import type { VocabularyItem } from '../../types/vocabulary'

function makeWord(overrides: Partial<VocabularyItem> = {}): VocabularyItem {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    japanese: 'たべる',
    kanji: '食べる',
    kana: 'たべる',
    meaning: 'to eat',
    partOfSpeech: 'ichidan verb',
    level: 'N5',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('vocabularyRepository', () => {
  it('adds and retrieves a word by id', async () => {
    const word = makeWord()
    await vocabularyRepository.add(word)
    const found = await vocabularyRepository.getById(word.id)
    expect(found).toEqual(word)
  })

  it('queries by level', async () => {
    await vocabularyRepository.addMany([
      makeWord({ level: 'N5' }),
      makeWord({ level: 'N5' }),
      makeWord({ level: 'N4' }),
    ])
    expect(await vocabularyRepository.getByLevel('N5')).toHaveLength(2)
    expect(await vocabularyRepository.getByLevel('N4')).toHaveLength(1)
    expect(await vocabularyRepository.getByLevel('N3')).toHaveLength(0)
  })

  it('filters by memorization status via a join against studyState', async () => {
    const memorized = makeWord({ level: 'N5' })
    const learning = makeWord({ level: 'N5' })
    await vocabularyRepository.addMany([memorized, learning])
    await studyStateRepository.markMemorized(memorized.id)
    await studyStateRepository.recordCorrect(learning.id)

    const memorizedWords = await vocabularyRepository.getByMemorizationStatus('N5', 'memorized')
    expect(memorizedWords.map((w) => w.id)).toEqual([memorized.id])
  })

  it('deletes a word and its associated study state', async () => {
    const word = makeWord()
    await vocabularyRepository.add(word)
    await studyStateRepository.recordCorrect(word.id)

    await vocabularyRepository.delete(word.id)

    expect(await vocabularyRepository.getById(word.id)).toBeUndefined()
    expect(await studyStateRepository.get(word.id)).toBeUndefined()
  })

  it('updates an existing word', async () => {
    const word = makeWord()
    await vocabularyRepository.add(word)
    await vocabularyRepository.update({ ...word, notes: 'updated note' })
    expect((await vocabularyRepository.getById(word.id))?.notes).toBe('updated note')
  })
})
