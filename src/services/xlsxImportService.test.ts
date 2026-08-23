import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { xlsxImportService } from './xlsxImportService'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { studyStateRepository } from '../data/repositories/studyStateRepository'

const HEADERS = [
  'Japanese',
  'Kanji',
  'Kana',
  'Meaning',
  'Part of Speech',
  'Example Sentence',
  'Example Meaning',
  'Notes',
]

function buildXlsxFile(rows: string[][]): File {
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Vocabulary')
  const arrayBuffer: ArrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new File([arrayBuffer], 'vocab.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('xlsxImportService', () => {
  it('parses valid rows and flags an invalid row without dropping the valid ones', async () => {
    const file = buildXlsxFile([
      ['たべる', '食べる', 'たべる', 'to eat', 'ichidan verb', 'すしを食べる。', 'I eat sushi.', ''],
      ['これ', '', 'これ', 'this', 'pronoun', '', '', ''], // kanji intentionally blank — should still be valid
      ['あります', '', '', '', 'godan verb', '', '', ''], // missing kana + meaning — should be reported invalid
    ])

    const parsed = await xlsxImportService.parseFile(file)
    expect(parsed.missingRequiredColumns).toEqual([])

    const { validDrafts, errors } = xlsxImportService.validateRows(parsed)
    expect(validDrafts).toHaveLength(2)
    expect(validDrafts[1].kanji).toBe('') // kana-only word imported with blank kanji

    expect(errors).toHaveLength(1)
    expect(errors[0].row).toBe(4) // header=1, row2, row3 valid, row4 invalid
    expect(errors[0].messages.join(' ')).toContain('Kana')
    expect(errors[0].messages.join(' ')).toContain('Meaning')
  })

  it('reports missing required columns instead of guessing', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Japanese', 'Kanji', 'Kana', 'Part of Speech'], // Meaning column missing entirely
      ['ねこ', '猫', 'ねこ', 'noun'],
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Vocab')
    const arrayBuffer: ArrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    const file = new File([arrayBuffer], 'vocab.xlsx')

    const parsed = await xlsxImportService.parseFile(file)
    expect(parsed.missingRequiredColumns).toContain('meaning')

    const { validDrafts, errors } = xlsxImportService.validateRows(parsed)
    expect(validDrafts).toHaveLength(0)
    expect(errors[0].messages[0]).toMatch(/Missing required column/)
  })

  it('imports valid rows end-to-end into IndexedDB under the chosen level, creating initial study state', async () => {
    const file = buildXlsxFile([
      ['たべる', '食べる', 'たべる', 'to eat', 'ichidan verb', '', '', ''],
      ['これ', '', 'これ', 'this', 'pronoun', '', '', ''],
    ])

    const summary = await xlsxImportService.importVocabulary(file, 'N5')
    expect(summary.importedCount).toBe(2)
    expect(summary.skippedCount).toBe(0)
    expect(summary.errors).toEqual([])

    const stored = await vocabularyRepository.getByLevel('N5')
    expect(stored).toHaveLength(2)
    expect(stored.every((w) => w.level === 'N5')).toBe(true)

    // The XLSX level is never read even if present — level always comes from the user's selection.
    for (const word of stored) {
      const state = await studyStateRepository.get(word.id)
      expect(state?.status).toBe('new')
    }
  })
})
