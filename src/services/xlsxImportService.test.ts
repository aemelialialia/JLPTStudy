import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { xlsxImportService } from './xlsxImportService'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { studyStateRepository } from '../data/repositories/studyStateRepository'

function buildXlsxFile(
  rows: string[][],
  options: { headers?: string[]; fileName?: string } = {},
): File {
  const headers = options.headers ?? ['Vocab', 'Reading', 'Meaning', 'Part of Speech']
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Vocabulary')
  const arrayBuffer: ArrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new File([arrayBuffer], options.fileName ?? 'vocab.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('xlsxImportService.buildPreview — file-level validation', () => {
  it('rejects a non-.xlsx file before attempting to parse it', async () => {
    const file = new File(['not a spreadsheet'], 'vocab.csv', { type: 'text/csv' })
    await expect(xlsxImportService.buildPreview(file, 'N5')).rejects.toThrow(/\.xlsx/i)
  })

  it('rejects an empty file', async () => {
    const file = new File([], 'vocab.xlsx')
    await expect(xlsxImportService.buildPreview(file, 'N5')).rejects.toThrow(/empty/i)
  })

  it('rejects a corrupted/unreadable .xlsx file without crashing', async () => {
    // A real .xlsx is a ZIP archive, so a corrupted one is well simulated by
    // a valid ZIP local-file-header magic number followed by garbage —
    // SheetJS is lenient about plain text/CSV-like content (it'll happily
    // "parse" a garbage text string as a one-cell sheet), but a file that
    // claims to be a ZIP and isn't a valid one reliably fails to parse.
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...Array(60).fill(0xab)])
    const file = new File([bytes], 'vocab.xlsx')
    await expect(xlsxImportService.buildPreview(file, 'N5')).rejects.toThrow(/could not be read|corrupted/i)
  })

  it('reports a clear error naming every missing required column', async () => {
    const file = buildXlsxFile([['学校', 'がっこう', 'school']], {
      headers: ['Vocab', 'Reading', 'Meaning'], // "Part of Speech" missing entirely
    })
    await expect(xlsxImportService.buildPreview(file, 'N5')).rejects.toThrow(/Part of Speech/)
  })

  it('tolerates whitespace differences in headers without fuzzy-matching unrelated names', async () => {
    const file = buildXlsxFile([['学校', 'がっこう', 'school', 'Noun']], {
      headers: [' Vocab ', 'Reading ', ' Meaning', 'Part of Speech'],
    })
    const preview = await xlsxImportService.buildPreview(file, 'N5')
    expect(preview.validRowCount).toBe(1)
  })

  it('rejects a spreadsheet with no data rows', async () => {
    const file = buildXlsxFile([])
    await expect(xlsxImportService.buildPreview(file, 'N5')).rejects.toThrow(/no data rows/i)
  })
})

describe('xlsxImportService.buildPreview — row validation', () => {
  it('skips fully blank rows without counting them as errors', async () => {
    const file = buildXlsxFile([
      ['学校', 'がっこう', 'school', 'Noun'],
      ['', '', '', ''],
      ['食べる', 'たべる', 'to eat', 'Verb'],
    ])
    const preview = await xlsxImportService.buildPreview(file, 'N5')
    expect(preview.blankRowsSkipped).toBe(1)
    expect(preview.validRowCount).toBe(2)
    expect(preview.invalidRowCount).toBe(0)
    expect(preview.errors).toEqual([])
  })

  it('reports the row number and specific missing field(s) for an invalid row, without dropping other rows', async () => {
    const file = buildXlsxFile([
      ['学校', 'がっこう', 'school', 'Noun'],
      ['大きい', '', 'big', ''], // row 3: missing Reading and Part of Speech
      ['食べる', 'たべる', 'to eat', 'Verb'],
    ])
    const preview = await xlsxImportService.buildPreview(file, 'N5')

    expect(preview.validRowCount).toBe(2)
    expect(preview.invalidRowCount).toBe(1)
    expect(preview.errors).toEqual([
      { row: 3, messages: ['Missing Reading', 'Missing Part of Speech'] },
    ])
  })

  it('trims whitespace but preserves Japanese content exactly, and never modifies the supplied reading', async () => {
    const file = buildXlsxFile([['  学校  ', '  がっこう  ', ' school ', ' Noun ']])
    const preview = await xlsxImportService.buildPreview(file, 'N5')
    expect(preview.sampleRows[0]).toEqual({
      vocab: '学校',
      reading: 'がっこう',
      meaning: 'school',
      partOfSpeech: 'Noun',
    })
  })

  it('ignores an extraneous JLPT Level column in the file — level always comes from the user selection', async () => {
    const file = buildXlsxFile([['学校', 'がっこう', 'school', 'Noun', 'N3']], {
      headers: ['Vocab', 'Reading', 'Meaning', 'Part of Speech', 'JLPT Level'],
    })
    const preview = await xlsxImportService.buildPreview(file, 'N5')
    expect(preview.validRowCount).toBe(1)
    expect(preview.plan[0].action).toBe('create')
  })
})

describe('xlsxImportService.buildPreview — duplicate detection', () => {
  it('flags a second occurrence of the same vocab+reading within one file as a duplicate, keeping the first', async () => {
    const file = buildXlsxFile([
      ['学校', 'がっこう', 'school', 'Noun'],
      ['学校', 'がっこう', 'school (dup)', 'Noun'],
    ])
    const preview = await xlsxImportService.buildPreview(file, 'N5')

    expect(preview.duplicateInFileCount).toBe(1)
    expect(preview.newCount).toBe(1)
    expect(preview.plan[0]).toMatchObject({ row: 2, action: 'create' })
    expect(preview.plan[1]).toMatchObject({ row: 3, action: 'duplicate-in-file', firstOccurrenceRow: 2 })
  })

  it('classifies rows matching an already-imported word as "existing", not "new"', async () => {
    const existing = await vocabularyRepository.commitImportPlan('N5', [
      { row: 2, action: 'create', draft: { vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun' } },
    ])
    expect(existing.createdCount).toBe(1)

    const file = buildXlsxFile([
      ['学校', 'がっこう', 'school', 'Noun'], // identical -> "unchanged"
      ['食べる', 'たべる', 'to eat', 'Verb'], // brand new
    ])
    const preview = await xlsxImportService.buildPreview(file, 'N5')

    expect(preview.newCount).toBe(1)
    expect(preview.existingCount).toBe(1)
    expect(preview.plan.find((e) => e.draft.vocab === '学校')?.action).toBe('unchanged')
    expect(preview.plan.find((e) => e.draft.vocab === '食べる')?.action).toBe('create')
  })

  it('does not consider matching English meaning alone sufficient for duplicate detection', async () => {
    await vocabularyRepository.commitImportPlan('N5', [
      { row: 2, action: 'create', draft: { vocab: '大きい', reading: 'おおきい', meaning: 'big', partOfSpeech: 'い-adjective' } },
    ])

    // A different word that happens to share the English meaning "big" must be treated as new.
    const file = buildXlsxFile([['広い', 'ひろい', 'big', 'い-adjective']])
    const preview = await xlsxImportService.buildPreview(file, 'N5')
    expect(preview.newCount).toBe(1)
    expect(preview.existingCount).toBe(0)
  })

  it('keeps duplicate detection scoped per level — the same word in N4 does not collide with N5', async () => {
    await vocabularyRepository.commitImportPlan('N5', [
      { row: 2, action: 'create', draft: { vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun' } },
    ])

    const file = buildXlsxFile([['学校', 'がっこう', 'school', 'Noun']])
    const preview = await xlsxImportService.buildPreview(file, 'N4')
    expect(preview.newCount).toBe(1)
    expect(preview.existingCount).toBe(0)
  })
})

describe('xlsxImportService.commitImport', () => {
  it('writes nothing during buildPreview and only writes once commitImport is called', async () => {
    const file = buildXlsxFile([['学校', 'がっこう', 'school', 'Noun']])
    await xlsxImportService.buildPreview(file, 'N5')
    expect(await vocabularyRepository.getByLevel('N5')).toEqual([])
  })

  it('imports end-to-end and reflects the real post-import database state, not an assumed count', async () => {
    const file = buildXlsxFile([
      ['学校', 'がっこう', 'school', 'Noun'],
      ['食べる', 'たべる', 'to eat', 'Verb'],
      ['大きい', '', 'big', ''], // invalid: missing Reading + Part of Speech
    ])
    const preview = await xlsxImportService.buildPreview(file, 'N5')
    const result = await xlsxImportService.commitImport(preview)

    expect(result).toMatchObject({
      level: 'N5',
      createdCount: 2,
      updatedCount: 0,
      unchangedCount: 0,
      duplicateInFileCount: 0,
      invalidCount: 1,
      totalForLevel: 2,
    })

    const stored = await vocabularyRepository.getByLevel('N5')
    expect(stored).toHaveLength(2)
    for (const word of stored) {
      expect((await studyStateRepository.get(word.id))?.status).toBe('new')
    }
  })

  it('re-import preserves id and study state, and updates content that changed', async () => {
    const firstFile = buildXlsxFile([['学校', 'がっこう', 'school', 'Noun']])
    const firstPreview = await xlsxImportService.buildPreview(firstFile, 'N5')
    await xlsxImportService.commitImport(firstPreview)

    const [word] = await vocabularyRepository.getByLevel('N5')
    await studyStateRepository.markMemorized(word.id)
    await studyStateRepository.recordCorrect(word.id)
    const stateBeforeReimport = await studyStateRepository.get(word.id)

    // Re-import the same word with a corrected meaning.
    const secondFile = buildXlsxFile([['学校', 'がっこう', 'a school (corrected)', 'Noun']])
    const secondPreview = await xlsxImportService.buildPreview(secondFile, 'N5')
    expect(secondPreview.existingCount).toBe(1)
    expect(secondPreview.newCount).toBe(0)

    const result = await xlsxImportService.commitImport(secondPreview)
    expect(result).toMatchObject({ createdCount: 0, updatedCount: 1, totalForLevel: 1 })

    const reimported = await vocabularyRepository.getById(word.id)
    expect(reimported?.id).toBe(word.id) // id preserved
    expect(reimported?.meaning).toBe('a school (corrected)')
    expect(await studyStateRepository.get(word.id)).toEqual(stateBeforeReimport) // study state untouched
  })

  it('re-importing identical content again reports it as unchanged, not updated or duplicated', async () => {
    const file = buildXlsxFile([['学校', 'がっこう', 'school', 'Noun']])
    await xlsxImportService.commitImport(await xlsxImportService.buildPreview(file, 'N5'))

    const secondPreview = await xlsxImportService.buildPreview(buildXlsxFile([['学校', 'がっこう', 'school', 'Noun']]), 'N5')
    const result = await xlsxImportService.commitImport(secondPreview)

    expect(result).toMatchObject({ createdCount: 0, updatedCount: 0, unchangedCount: 1, totalForLevel: 1 })
  })
})
