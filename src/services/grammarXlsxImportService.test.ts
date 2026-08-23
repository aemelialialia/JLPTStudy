import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { grammarXlsxImportService } from './grammarXlsxImportService'
import { grammarImportRepository } from '../data/repositories/grammarImportRepository'
import { importedGrammarId } from '../types/grammarImport'

const DEFAULT_HEADERS = [
  'Grammar Point',
  'Meaning',
  'Formation',
  'Usage',
  'Example Sentence',
  'Example Meaning',
  'Notes',
  'Common Mistakes',
  'Related Grammar',
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

describe('grammarXlsxImportService.buildPreview — file-level validation', () => {
  it('rejects a non-.xlsx file before attempting to parse it', async () => {
    const file = new File(['not a spreadsheet'], 'grammar.csv', { type: 'text/csv' })
    await expect(grammarXlsxImportService.buildPreview(file, 'N5')).rejects.toThrow(/\.xlsx/i)
  })

  it('reports a clear error naming every missing required column', async () => {
    const file = buildXlsxFile([['〜てください', 'Please do ~', 'Verb (te-form) + ください', 'Polite request']], {
      headers: ['Grammar Point', 'Meaning', 'Formation'], // Usage missing entirely
    })
    await expect(grammarXlsxImportService.buildPreview(file, 'N5')).rejects.toThrow(/Usage/)
  })

  it('does not require a JLPT Level column in the spreadsheet — level always comes from the user selection', async () => {
    const file = buildXlsxFile([['〜てください', 'Please do ~', 'Verb (te-form) + ください', 'Polite request', '', '', '', '', '']])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N3')
    expect(preview.level).toBe('N3')
    expect(preview.validRowCount).toBe(1)
  })
})

describe('grammarXlsxImportService.buildPreview — row validation', () => {
  it('reports the row number and specific missing field(s) for an invalid row, without dropping other rows', async () => {
    const file = buildXlsxFile([
      ['〜てください', 'Please do ~', 'Verb (te-form) + ください', 'Polite request', '', '', '', '', ''],
      ['〜ながら', '', 'Verb (masu-stem) + ながら', '', '', '', '', '', ''], // missing Meaning + Usage
    ])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N4')

    expect(preview.validRowCount).toBe(1)
    expect(preview.invalidRowCount).toBe(1)
    expect(preview.errors).toEqual([{ row: 3, messages: ['Missing Meaning', 'Missing Usage'] }])
  })

  it('builds an example from Example Sentence/Example Meaning only when a sentence is present', async () => {
    const file = buildXlsxFile([
      ['〜てください', 'Please do ~', 'Verb (te-form) + ください', 'Polite request', 'ここに座ってください。', 'Please sit here.', '', '', ''],
    ])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N5')
    const result = await grammarXlsxImportService.commitImport(preview)
    expect(result.createdCount).toBe(1)

    const [entry] = await grammarImportRepository.getByLevel('N5')
    expect(entry.examples).toEqual([{ sentence: 'ここに座ってください。', meaning: 'Please sit here.' }])
  })
})

describe('grammarXlsxImportService — stable ids and duplicate detection', () => {
  it('assigns the same deterministic id to the same (level, grammar point) pair every time', async () => {
    const file = buildXlsxFile([['〜てください', 'Please do ~', 'Verb (te-form) + ください', 'Polite request', '', '', '', '', '']])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N5')
    expect(preview.plan[0].id).toBe(importedGrammarId('N5', '〜てください'))
  })

  it('flags a second occurrence of the same grammar point within one file as a duplicate, keeping the first', async () => {
    const file = buildXlsxFile([
      ['〜てください', 'Please do ~', 'Verb (te-form) + ください', 'Polite request', '', '', '', '', ''],
      ['〜てください', 'Please do ~ (dup)', 'Verb (te-form) + ください', 'Polite request', '', '', '', '', ''],
    ])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N5')

    expect(preview.duplicateInFileCount).toBe(1)
    expect(preview.newCount).toBe(1)
    expect(preview.plan[1]).toMatchObject({ action: 'duplicate-in-file', firstOccurrenceRow: 2 })
  })

  it('re-importing the same grammar point updates the existing record in place rather than duplicating it', async () => {
    const first = buildXlsxFile([['〜てください', 'Please do ~', 'Verb (te-form) + ください', 'Polite request', '', '', '', '', '']])
    await grammarXlsxImportService.commitImport(await grammarXlsxImportService.buildPreview(first, 'N5'))

    const second = buildXlsxFile([
      ['〜てください', 'Please do ~ (revised)', 'Verb (te-form) + ください', 'Polite request', '', '', '', '', ''],
    ])
    const secondPreview = await grammarXlsxImportService.buildPreview(second, 'N5')
    expect(secondPreview.existingCount).toBe(1)
    expect(secondPreview.newCount).toBe(0)

    const result = await grammarXlsxImportService.commitImport(secondPreview)
    expect(result).toMatchObject({ createdCount: 0, updatedCount: 1, totalForLevel: 1 })

    const all = await grammarImportRepository.getByLevel('N5')
    expect(all).toHaveLength(1)
    expect(all[0].meaning).toBe('Please do ~ (revised)')
  })

  it('re-importing identical content again reports it as unchanged, not updated or duplicated', async () => {
    const file = buildXlsxFile([['〜てください', 'Please do ~', 'Verb (te-form) + ください', 'Polite request', '', '', '', '', '']])
    await grammarXlsxImportService.commitImport(await grammarXlsxImportService.buildPreview(file, 'N5'))

    const secondPreview = await grammarXlsxImportService.buildPreview(
      buildXlsxFile([['〜てください', 'Please do ~', 'Verb (te-form) + ください', 'Polite request', '', '', '', '', '']]),
      'N5',
    )
    const result = await grammarXlsxImportService.commitImport(secondPreview)
    expect(result).toMatchObject({ createdCount: 0, updatedCount: 0, unchangedCount: 1, totalForLevel: 1 })
  })
})

describe('grammarXlsxImportService — related grammar resolution', () => {
  it('resolves Related Grammar text to ids of other entries in the same import, ignoring unmatched names', async () => {
    const file = buildXlsxFile([
      ['〜てください', 'Please do ~', 'Verb (te-form) + ください', 'Polite request', '', '', '', '', '〜ないでください'],
      ['〜ないでください', 'Please do not ~', 'Verb (nai-form) + でください', 'Polite negative request', '', '', '', '', 'Nonexistent Point'],
    ])
    const preview = await grammarXlsxImportService.buildPreview(file, 'N5')
    await grammarXlsxImportService.commitImport(preview)

    const all = await grammarImportRepository.getByLevel('N5')
    const please = all.find((e) => e.grammarPoint === '〜てください')
    const pleaseNot = all.find((e) => e.grammarPoint === '〜ないでください')
    expect(please?.relatedGrammar).toEqual([pleaseNot?.id])
    expect(pleaseNot?.relatedGrammar).toEqual([]) // "Nonexistent Point" matches nothing, silently dropped
  })
})

describe('grammarXlsxImportService.commitImport', () => {
  it('writes nothing during buildPreview and only writes once commitImport is called', async () => {
    const file = buildXlsxFile([['〜てください', 'Please do ~', 'Verb (te-form) + ください', 'Polite request', '', '', '', '', '']])
    await grammarXlsxImportService.buildPreview(file, 'N5')
    expect(await grammarImportRepository.getByLevel('N5')).toEqual([])
  })
})
