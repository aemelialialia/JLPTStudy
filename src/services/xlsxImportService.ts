import * as XLSX from 'xlsx'
import type { JLPTLevel } from '../types/jlpt'
import type { VocabularyDraft } from '../types/vocabulary'
import { vocabularyIdentityKey } from '../types/vocabulary'
import type {
  CanonicalVocabColumn,
  ImportCommitResult,
  ImportPlanEntry,
  ImportPreview,
  RowValidationError,
} from '../types/vocabularyImport'
import { VOCAB_COLUMN_LABELS } from '../types/vocabularyImport'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { importedFilesRepository } from '../data/repositories/importedFilesRepository'

const REQUIRED_COLUMNS: CanonicalVocabColumn[] = ['vocab', 'reading', 'meaning', 'partOfSpeech']
const SAMPLE_ROW_LIMIT = 10

/** Maps a normalized header string to the canonical field it represents. Exact matches only — whitespace/case is tolerated, but unrelated names are never guessed. */
const HEADER_ALIASES: Record<string, CanonicalVocabColumn> = {
  vocab: 'vocab',
  reading: 'reading',
  meaning: 'meaning',
  'part of speech': 'partOfSpeech',
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ')
}

interface ParsedWorkbook {
  /** canonical field -> column index in the header row. */
  headerMap: Partial<Record<CanonicalVocabColumn, number>>
  missingRequiredColumns: CanonicalVocabColumn[]
  /** Every row after the header row, as raw cell arrays (may include blank rows). */
  dataRows: unknown[][]
}

function isXlsxFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.xlsx')
}

/**
 * Reads an .xlsx File entirely client-side (SheetJS) into a header row +
 * data rows. Only the first worksheet is read. Never uploaded anywhere.
 *
 * The header row is read explicitly (array-of-arrays mode) rather than
 * relying on SheetJS's object-row keys, specifically so that "which
 * columns exist" can be determined independently of "how many data rows
 * exist" — a header-only sheet (zero data rows) must still be able to
 * report its columns correctly rather than looking like every column is
 * missing.
 */
function parseWorkbook(buffer: ArrayBuffer): ParsedWorkbook {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'array' })
  } catch {
    throw new Error('This file could not be read. It may be corrupted or not a valid XLSX file.')
  }

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error('This spreadsheet has no worksheets.')
  }

  const sheet = workbook.Sheets[firstSheetName]
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
  const headerRow = (aoa[0] ?? []).map((cell) => String(cell ?? ''))
  const dataRows = aoa.slice(1)

  const headerMap: Partial<Record<CanonicalVocabColumn, number>> = {}
  headerRow.forEach((header, index) => {
    const canonical = HEADER_ALIASES[normalizeHeader(header)]
    if (canonical && !(canonical in headerMap)) {
      headerMap[canonical] = index
    }
  })

  const missingRequiredColumns = REQUIRED_COLUMNS.filter((col) => !(col in headerMap))
  return { headerMap, missingRequiredColumns, dataRows }
}

function cellAt(row: unknown[], headerMap: ParsedWorkbook['headerMap'], col: CanonicalVocabColumn): string {
  const index = headerMap[col]
  if (index === undefined) return ''
  return String(row[index] ?? '').trim()
}

function isBlankRow(row: unknown[], headerMap: ParsedWorkbook['headerMap']): boolean {
  return REQUIRED_COLUMNS.every((col) => cellAt(row, headerMap, col) === '')
}

interface ValidatedRow {
  row: number
  draft: VocabularyDraft
}

function validateRows(parsed: ParsedWorkbook): {
  validRows: ValidatedRow[]
  errors: RowValidationError[]
  blankRowsSkipped: number
} {
  const validRows: ValidatedRow[] = []
  const errors: RowValidationError[] = []
  let blankRowsSkipped = 0

  parsed.dataRows.forEach((row, index) => {
    const rowNumber = index + 2 // +1 for header row, +1 for 0-based index

    if (isBlankRow(row, parsed.headerMap)) {
      blankRowsSkipped++
      return
    }

    const draft: VocabularyDraft = {
      vocab: cellAt(row, parsed.headerMap, 'vocab'),
      reading: cellAt(row, parsed.headerMap, 'reading'),
      meaning: cellAt(row, parsed.headerMap, 'meaning'),
      partOfSpeech: cellAt(row, parsed.headerMap, 'partOfSpeech'),
    }

    const missing = REQUIRED_COLUMNS.filter((col) => !draft[col])
    if (missing.length > 0) {
      errors.push({ row: rowNumber, messages: missing.map((col) => `Missing ${VOCAB_COLUMN_LABELS[col]}`) })
      return
    }

    validRows.push({ row: rowNumber, draft })
  })

  return { validRows, errors, blankRowsSkipped }
}

export const xlsxImportService = {
  /**
   * Full parse -> validate -> plan pipeline. Reads the file entirely in
   * the browser and only ever *reads* from IndexedDB (to detect existing
   * matches) — nothing is written. Throws for file-level problems (wrong
   * type, corrupt/unreadable file, empty sheet, missing required
   * columns); row-level problems are collected into `errors` instead of
   * failing the whole import, per spec: one bad row must never crash it.
   */
  async buildPreview(file: File, level: JLPTLevel): Promise<ImportPreview> {
    if (!isXlsxFile(file)) {
      throw new Error('Please choose a .xlsx file.')
    }
    if (file.size === 0) {
      throw new Error('The selected file is empty.')
    }

    const buffer = await file.arrayBuffer()
    const parsed = parseWorkbook(buffer)

    if (parsed.missingRequiredColumns.length > 0) {
      const list = parsed.missingRequiredColumns.map((col) => VOCAB_COLUMN_LABELS[col]).join(', ')
      throw new Error(`Missing required column${parsed.missingRequiredColumns.length > 1 ? 's' : ''}: ${list}`)
    }
    if (parsed.dataRows.length === 0) {
      throw new Error('This spreadsheet has no data rows.')
    }

    const { validRows, errors, blankRowsSkipped } = validateRows(parsed)

    // Detect duplicates within this same file (by level+vocab+reading — the
    // same identity key used against the database below), first occurrence wins.
    const seenInFile = new Map<string, number>() // identity key -> first row number
    const plan: ImportPlanEntry[] = []

    for (const { row, draft } of validRows) {
      const key = vocabularyIdentityKey(level, draft.vocab, draft.reading)
      const firstOccurrenceRow = seenInFile.get(key)

      if (firstOccurrenceRow !== undefined) {
        plan.push({ row, draft, action: 'duplicate-in-file', firstOccurrenceRow })
        continue
      }
      seenInFile.set(key, row)

      const existing = await vocabularyRepository.findDuplicate(level, draft.vocab, draft.reading)
      if (!existing) {
        plan.push({ row, draft, action: 'create' })
      } else {
        const changed = existing.meaning !== draft.meaning || existing.partOfSpeech !== draft.partOfSpeech
        plan.push({ row, draft, action: changed ? 'update' : 'unchanged', existingId: existing.id })
      }
    }

    const duplicateInFileCount = plan.filter((e) => e.action === 'duplicate-in-file').length
    const newCount = plan.filter((e) => e.action === 'create').length
    const existingCount = plan.filter((e) => e.action === 'update' || e.action === 'unchanged').length

    return {
      level,
      fileName: file.name,
      fileSizeBytes: file.size,
      totalRows: parsed.dataRows.length,
      blankRowsSkipped,
      validRowCount: validRows.length,
      invalidRowCount: errors.length,
      duplicateInFileCount,
      newCount,
      existingCount,
      errors,
      sampleRows: validRows.slice(0, SAMPLE_ROW_LIMIT).map((r) => r.draft),
      plan,
    }
  },

  /**
   * Writes exactly the plan computed by buildPreview() — nothing is
   * re-derived or re-validated here, so what the user confirmed in the
   * preview is exactly what gets written. Delegates the actual
   * (transactional) write to vocabularyRepository.commitImportPlan.
   */
  async commitImport(preview: ImportPreview): Promise<ImportCommitResult> {
    const result = await vocabularyRepository.commitImportPlan(preview.level, preview.plan)
    // Records the file name for Settings' "Uploaded Files" list. Recorded
    // after the write succeeds, so a failed commit never shows up as an
    // uploaded file.
    await importedFilesRepository.recordImport('vocabulary', preview.level, preview.fileName)
    return { ...result, invalidCount: preview.invalidRowCount }
  },
}
