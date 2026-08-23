import * as XLSX from 'xlsx'
import type { VocabularyDraft, VocabularyItem } from '../types/vocabulary'
import type { JLPTLevel } from '../types/jlpt'
import { createInitialStudyState } from '../types/studyState'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { studyStateRepository } from '../data/repositories/studyStateRepository'

const REQUIRED_COLUMNS = ['japanese', 'kanji', 'kana', 'meaning', 'partOfSpeech'] as const
const OPTIONAL_COLUMNS = ['exampleSentence', 'exampleMeaning', 'notes'] as const

type CanonicalColumn = (typeof REQUIRED_COLUMNS)[number] | (typeof OPTIONAL_COLUMNS)[number]

/** Maps a normalized header string to the canonical field it represents. */
const HEADER_ALIASES: Record<string, CanonicalColumn> = {
  japanese: 'japanese',
  kanji: 'kanji',
  kana: 'kana',
  meaning: 'meaning',
  partofspeech: 'partOfSpeech',
  examplesentence: 'exampleSentence',
  examplemeaning: 'exampleMeaning',
  notes: 'notes',
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_/-]+/g, '')
}

export interface RowValidationError {
  /** 1-based row number as it would appear in the spreadsheet (header = row 1). */
  row: number
  messages: string[]
}

export interface ParsedWorkbookResult {
  /** canonical field -> the original column header text found in the file. */
  headerMap: Partial<Record<CanonicalColumn, string>>
  missingRequiredColumns: CanonicalColumn[]
  rawRows: Record<string, unknown>[]
}

export interface ValidationResult {
  validDrafts: VocabularyDraft[]
  errors: RowValidationError[]
}

export interface ImportSummary {
  totalRows: number
  importedCount: number
  skippedCount: number
  errors: RowValidationError[]
}

export const xlsxImportService = {
  /**
   * Reads an .xlsx File entirely client-side (via SheetJS) and returns raw
   * row objects keyed by their original header text. The File is never
   * sent anywhere — this all happens in-memory in the browser tab. Only
   * the first worksheet is read.
   */
  async parseFile(file: File): Promise<ParsedWorkbookResult> {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      return { headerMap: {}, missingRequiredColumns: [...REQUIRED_COLUMNS], rawRows: [] }
    }

    const sheet = workbook.Sheets[firstSheetName]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    const headerMap: Partial<Record<CanonicalColumn, string>> = {}
    if (rawRows.length > 0) {
      for (const originalHeader of Object.keys(rawRows[0])) {
        const canonical = HEADER_ALIASES[normalizeHeader(originalHeader)]
        if (canonical && !(canonical in headerMap)) {
          headerMap[canonical] = originalHeader
        }
      }
    }

    const missingRequiredColumns = REQUIRED_COLUMNS.filter((col) => !(col in headerMap))
    return { headerMap, missingRequiredColumns, rawRows }
  },

  /**
   * Validates parsed rows against the required fields. Note: "Kanji" must
   * be present as a *column*, but an individual cell may be blank — many
   * JLPT words (これ, とても, …) have no kanji form. Japanese, Kana,
   * Meaning, and Part of Speech must be non-blank per row.
   */
  validateRows(parsed: ParsedWorkbookResult): ValidationResult {
    const validDrafts: VocabularyDraft[] = []
    const errors: RowValidationError[] = []

    if (parsed.missingRequiredColumns.length > 0) {
      errors.push({
        row: 1,
        messages: parsed.missingRequiredColumns.map((col) => `Missing required column: ${col}`),
      })
      return { validDrafts, errors }
    }

    parsed.rawRows.forEach((raw, index) => {
      const rowNumber = index + 2 // 1 for header row + 1 for 0-based index
      const get = (col: CanonicalColumn): string => {
        const header = parsed.headerMap[col]
        if (!header) return ''
        return String(raw[header] ?? '').trim()
      }

      const japanese = get('japanese')
      const kanji = get('kanji') // allowed to be blank
      const kana = get('kana')
      const meaning = get('meaning')
      const partOfSpeech = get('partOfSpeech')

      const messages: string[] = []
      if (!japanese) messages.push('"Japanese" is required')
      if (!kana) messages.push('"Kana" is required')
      if (!meaning) messages.push('"Meaning" is required')
      if (!partOfSpeech) messages.push('"Part of Speech" is required')

      if (messages.length > 0) {
        errors.push({ row: rowNumber, messages })
        return
      }

      validDrafts.push({
        japanese,
        kanji,
        kana,
        meaning,
        partOfSpeech,
        exampleSentence: get('exampleSentence') || undefined,
        exampleMeaning: get('exampleMeaning') || undefined,
        notes: get('notes') || undefined,
      })
    })

    return { validDrafts, errors }
  },

  /**
   * Full import pipeline: parse -> validate -> user-selected level ->
   * persist to IndexedDB. Only valid rows are imported; invalid rows are
   * reported back (never silently dropped) so the caller can show the
   * user exactly what to fix. The original XLSX file/bytes are discarded
   * once parsing completes — nothing but the extracted vocabulary fields
   * is retained.
   */
  async importVocabulary(file: File, level: JLPTLevel): Promise<ImportSummary> {
    const parsed = await xlsxImportService.parseFile(file)
    const { validDrafts, errors } = xlsxImportService.validateRows(parsed)

    const items: VocabularyItem[] = validDrafts.map((draft) => ({
      ...draft,
      id: crypto.randomUUID(),
      level,
      createdAt: new Date().toISOString(),
    }))

    await vocabularyRepository.addMany(items)
    await Promise.all(
      items.map((item) => studyStateRepository.upsert(createInitialStudyState(item.id))),
    )

    return {
      totalRows: parsed.rawRows.length,
      importedCount: items.length,
      skippedCount: parsed.rawRows.length - items.length,
      errors,
    }
  },
}
