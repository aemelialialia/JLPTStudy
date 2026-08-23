import { describe, it, expect } from 'vitest'
import { getDB, _resetDBConnectionForTests } from './db'

describe('IndexedDB initialization', () => {
  it('opens successfully and creates every expected object store', async () => {
    const db = await getDB()
    expect([...db.objectStoreNames].sort()).toEqual(
      ['dailyStudyState', 'mistakes', 'quizAttempts', 'settings', 'studyState', 'vocabulary'].sort(),
    )
  })

  it('persists data across separate connections (simulating app reload)', async () => {
    const db = await getDB()
    await db.put('vocabulary', {
      id: 'v1',
      japanese: 'ねこ',
      kanji: '猫',
      kana: 'ねこ',
      meaning: 'cat',
      partOfSpeech: 'noun',
      level: 'N5',
      createdAt: new Date().toISOString(),
    })

    // Force a brand new connection, as if the app were reloaded.
    await _resetDBConnectionForTests()
    const reopened = await getDB()
    const stored = await reopened.get('vocabulary', 'v1')

    expect(stored?.meaning).toBe('cat')
  })
})
