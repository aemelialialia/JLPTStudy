import { describe, it, expect } from 'vitest'
import { exportImportService } from './exportImportService'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { studyStateRepository } from '../data/repositories/studyStateRepository'
import { settingsRepository } from '../data/repositories/settingsRepository'
import type { VocabularyItem } from '../types/vocabulary'

const word: VocabularyItem = {
  id: 'w1',
  japanese: 'ねこ',
  kanji: '猫',
  kana: 'ねこ',
  meaning: 'cat',
  partOfSpeech: 'noun',
  level: 'N5',
  createdAt: new Date().toISOString(),
}

describe('exportImportService', () => {
  it('builds an export payload containing everything currently stored', async () => {
    await vocabularyRepository.add(word)
    await studyStateRepository.markMemorized('w1')

    const payload = await exportImportService.buildExportPayload()
    expect(payload.schemaVersion).toBe(1)
    expect(payload.vocabulary).toEqual([word])
    expect(payload.studyState[0]).toMatchObject({ vocabularyId: 'w1', status: 'memorized' })
  })

  it('round-trips: export then import into a cleared store restores the data', async () => {
    await vocabularyRepository.add(word)
    await studyStateRepository.markMemorized('w1')
    const payload = await exportImportService.buildExportPayload()

    await exportImportService.clearAllData()
    expect(await vocabularyRepository.getById('w1')).toBeUndefined()

    await exportImportService.importPayload(payload)
    expect(await vocabularyRepository.getById('w1')).toEqual(word)
    expect((await studyStateRepository.get('w1'))?.status).toBe('memorized')
  })

  it('rejects a payload that is not a recognizable export', async () => {
    await expect(exportImportService.importPayload({ not: 'an export' })).rejects.toThrow(
      /not a valid/i,
    )
  })

  it('clearing study data leaves user settings untouched', async () => {
    await settingsRepository.update({ defaultSessionSize: 20 })
    await vocabularyRepository.add(word)

    await exportImportService.clearAllData()

    expect(await vocabularyRepository.getAll()).toEqual([])
    expect((await settingsRepository.get()).defaultSessionSize).toBe(20)
  })
})
