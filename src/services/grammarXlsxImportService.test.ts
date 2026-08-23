import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { grammarXlsxImportService } from './grammarXlsxImportService'
import { grammarImportRepository } from '../data/repositories/grammarImportRepository'
import { importedGrammarId } from '../types/grammarImport'

const DEFAULT_HEADERS = [
  'Category',
  'Grammar Point',
  'Formation / Structure',
  'English Meaning',
  'Core Usage',
  'Minna no Nihongo Lesson(s)',
  'New Concept Japanese Coverage',
  'Priority',
  'Notes',
  'Mastery',
]

function buildXlsxFile(rows: string[][], options: { headers?: string[]; fileName?: string } = {}): File {
  const headers = options.headers ?? DEFAULT_HEADERS
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Grammar')
  const arrayBuffer: ArrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new File([arrayBuffer], options.fileName ?? 'grammar.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// A single well-formed row matching DEFAULT_HEADERS' order exactly.
const TE_KUDASAI_ROW = ['Request', '〜てください', 'Verb (te-form) + ください', 'Please do ~', 'Polite request', 'Lesson 3', 'Ch. 4', 'High', 'Softer than an imperative', 'Beginner']

describe('grammarXlsxImportService.buildPreview — file-level validation', () => {
  it('rejects a non-.xlsx file before attempting to parse it', async () => {
    const file = new File(['not a spreadsheet'], 'grammar.csv', { type: 'text/csv' })
    await expect(grammarXlsxImportService.buildPreview(file, 'N5')).rejects.toThrow(/\.xlsx/i)
  })

  it('reports a clear error naming every missing required column, using the exact header text', async () => {
    const file = buildXlsxFile([['Request', '〜てください', 'Verb (te-form) + ください', 'Please do ~']], {
      headers: ['Category', 'Grammar Point', 'Formation / Structure', 'English Meaning'], // Core Usage + Priority missing entirely
    })
    await expect(grammarXlsxImportService.buildPreview(file, 'N5')).rejects.toThrow(/Core Usage/)
    await expect(grammarXlsxImportService.buildPreview(file, 'N5')).rejects.toThrow(/Priority/)
  })

  it('does not require a JLPT Level column in the spreadsheet — level always comes from the user selection', async () => {
    const file = buildXlsxFile([TE_KUDASAI_ROW])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N3')
    expect(preview.level).toBe('N3')
    expect(preview.validRowCount).toBe(1)
  })

  it('recognizes all ten headers, including the optional ones', async () => {
    const file = buildXlsxFile([TE_KUDASAI_ROW])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N5')
    const [row] = preview.sampleRows
    expect(row).toMatchObject({
      category: 'Request',
      grammarPoint: '〜てください',
      formation: 'Verb (te-form) + ください',
      meaning: 'Please do ~',
      usage: 'Polite request',
      minnaNoNihongoLessons: 'Lesson 3',
      newConceptJapaneseCoverage: 'Ch. 4',
      priority: 'High',
      notes: 'Softer than an imperative',
      sourceMastery: 'Beginner',
    })
  })
})

describe('grammarXlsxImportService.buildPreview — row validation', () => {
  it('reports the row number and specific missing field(s) for an invalid row, without dropping other rows', async () => {
    const file = buildXlsxFile([
      TE_KUDASAI_ROW,
      ['', '〜ながら', 'Verb (masu-stem) + ながら', '', 'Simultaneous actions', '', '', '', '', ''], // missing Category + English Meaning + Priority
    ])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N4')

    expect(preview.validRowCount).toBe(1)
    expect(preview.invalidRowCount).toBe(1)
    expect(preview.errors).toEqual([{ row: 3, messages: ['Missing Category', 'Missing English Meaning', 'Missing Priority'] }])
  })

  it('treats a row missing only optional fields (Minna no Nihongo, New Concept Japanese, Notes, Mastery) as fully valid', async () => {
    const file = buildXlsxFile([['Request', '〜てください', 'Verb (te-form) + ください', 'Please do ~', 'Polite request', '', '', 'High', '', '']])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N5')
    expect(preview.validRowCount).toBe(1)
    expect(preview.invalidRowCount).toBe(0)
  })

  it('ignores a completely blank row rather than reporting it as invalid', async () => {
    const file = buildXlsxFile([TE_KUDASAI_ROW, ['', '', '', '', '', '', '', '', '', '']])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N5')
    expect(preview.validRowCount).toBe(1)
    expect(preview.invalidRowCount).toBe(0)
    expect(preview.blankRowsSkipped).toBe(1)
  })

  it('computes grammarPointCount as valid + invalid rows (excluding blanks), matching the preview summary card', async () => {
    const file = buildXlsxFile([
      TE_KUDASAI_ROW,
      ['', '〜ながら', 'x', '', 'y', '', '', '', '', ''], // invalid: missing Category, English Meaning, Priority
      ['', '', '', '', '', '', '', '', '', ''], // blank
    ])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N5')
    expect(preview.grammarPointCount).toBe(2) // 1 valid + 1 invalid, blank excluded
    expect(preview.validRowCount).toBe(1)
    expect(preview.invalidRowCount).toBe(1)
    expect(preview.blankRowsSkipped).toBe(1)
  })
})

describe('grammarXlsxImportService — stable ids and duplicate detection', () => {
  it('assigns the same deterministic id to the same (level, grammar point) pair every time', async () => {
    const file = buildXlsxFile([TE_KUDASAI_ROW])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N5')
    expect(preview.plan[0].id).toBe(importedGrammarId('N5', '〜てください'))
  })

  it('flags a second occurrence of the same grammar point within one file as a duplicate, keeping the first', async () => {
    const file = buildXlsxFile([
      TE_KUDASAI_ROW,
      ['Request', '〜てください', 'Verb (te-form) + ください', 'Please do ~ (dup)', 'Polite request', '', '', 'High', '', ''],
    ])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N5')

    expect(preview.duplicateInFileCount).toBe(1)
    expect(preview.newCount).toBe(1)
    expect(preview.plan[1]).toMatchObject({ action: 'duplicate-in-file', firstOccurrenceRow: 2 })
  })

  it('matches primarily by (level, Grammar Point) — a different Category/Formation on re-import still resolves to the same record', async () => {
    const first = buildXlsxFile([TE_KUDASAI_ROW])
    await grammarXlsxImportService.commitImport(await grammarXlsxImportService.buildPreview(first, 'N5'))

    const second = buildXlsxFile([
      ['Politeness', '〜てください', 'Verb (te-form) + ください (revised)', 'Please do ~', 'Polite request', '', '', 'High', '', ''],
    ])
    const secondPreview = await grammarXlsxImportService.buildPreview(second, 'N5')
    expect(secondPreview.existingCount).toBe(1)
    expect(secondPreview.newCount).toBe(0)
    expect(secondPreview.plan[0].action).toBe('update')

    const result = await grammarXlsxImportService.commitImport(secondPreview)
    expect(result).toMatchObject({ createdCount: 0, updatedCount: 1, totalForLevel: 1 })

    const all = await grammarImportRepository.getByLevel('N5')
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ category: 'Politeness', formation: 'Verb (te-form) + ください (revised)' })
  })

  it('re-importing identical content again reports it as unchanged, not updated or duplicated', async () => {
    const file = buildXlsxFile([TE_KUDASAI_ROW])
    await grammarXlsxImportService.commitImport(await grammarXlsxImportService.buildPreview(file, 'N5'))

    const secondPreview = await grammarXlsxImportService.buildPreview(buildXlsxFile([TE_KUDASAI_ROW]), 'N5')
    expect(secondPreview.unchangedCount).toBe(1)
    expect(secondPreview.updateCount).toBe(0)

    const result = await grammarXlsxImportService.commitImport(secondPreview)
    expect(result).toMatchObject({ createdCount: 0, updatedCount: 0, unchangedCount: 1, totalForLevel: 1 })
  })

  it('re-importing the same spreadsheet never duplicates the grammar point, even from a different file name', async () => {
    const first = buildXlsxFile([TE_KUDASAI_ROW], { fileName: 'n5_grammar_v1.xlsx' })
    await grammarXlsxImportService.commitImport(await grammarXlsxImportService.buildPreview(first, 'N5'))

    const second = buildXlsxFile([TE_KUDASAI_ROW], { fileName: 'n5_grammar_v2_final.xlsx' })
    await grammarXlsxImportService.commitImport(await grammarXlsxImportService.buildPreview(second, 'N5'))

    const all = await grammarImportRepository.getByLevel('N5')
    expect(all).toHaveLength(1)
  })
})

describe('grammarXlsxImportService — Mastery is content metadata, never live user state', () => {
  it('stores the spreadsheet Mastery value as sourceMastery, distinct from any quiz-derived mastery', async () => {
    const file = buildXlsxFile([TE_KUDASAI_ROW]) // Mastery column = 'Beginner'
    await grammarXlsxImportService.commitImport(await grammarXlsxImportService.buildPreview(file, 'N5'))

    const [entry] = await grammarImportRepository.getByLevel('N5')
    expect(entry.sourceMastery).toBe('Beginner')
    // GrammarEntry has no live "mastered" field of its own — that concept
    // lives entirely on MistakeRecord, keyed by question id, never here.
    expect('mastered' in entry).toBe(false)
  })

  it('re-importing with a changed Mastery value updates sourceMastery, and only sourceMastery — this never touches MistakeRecord', async () => {
    const first = buildXlsxFile([TE_KUDASAI_ROW]) // Mastery = 'Beginner'
    await grammarXlsxImportService.commitImport(await grammarXlsxImportService.buildPreview(first, 'N5'))

    const revised = TE_KUDASAI_ROW.map((v) => v)
    revised[9] = 'Advanced'
    const second = buildXlsxFile([revised])
    const preview = await grammarXlsxImportService.buildPreview(second, 'N5')
    expect(preview.plan[0].action).toBe('update')

    await grammarXlsxImportService.commitImport(preview)
    const [entry] = await grammarImportRepository.getByLevel('N5')
    expect(entry.sourceMastery).toBe('Advanced')
  })
})

describe('grammarXlsxImportService.commitImport', () => {
  it('writes nothing during buildPreview and only writes once commitImport is called', async () => {
    const file = buildXlsxFile([TE_KUDASAI_ROW])
    await grammarXlsxImportService.buildPreview(file, 'N5')
    expect(await grammarImportRepository.getByLevel('N5')).toEqual([])
  })

  it('preserves free-text Priority and lesson cross-reference values verbatim, without normalizing them', async () => {
    const file = buildXlsxFile([
      ['Time', '〜前に', 'Noun + の / Verb (dictionary form) + 前に', 'Before doing ~', 'Sequencing', 'Lessons 20-21', 'Chapter 9, p. 112', 'Medium-High', '', ''],
    ])
    const result = await grammarXlsxImportService.commitImport(await grammarXlsxImportService.buildPreview(file, 'N5'))
    expect(result.createdCount).toBe(1)

    const [entry] = await grammarImportRepository.getByLevel('N5')
    expect(entry.priority).toBe('Medium-High')
    expect(entry.minnaNoNihongoLessons).toBe('Lessons 20-21')
    expect(entry.newConceptJapaneseCoverage).toBe('Chapter 9, p. 112')
  })
})
