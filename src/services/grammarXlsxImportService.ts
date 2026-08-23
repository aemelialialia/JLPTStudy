import * as XLSX from 'xlsx'
import type { JLPTLevel } from '../types/jlpt'
import type {
  CanonicalGrammarColumn,
  GrammarImportCommitResult,
  GrammarImportDraft,
  GrammarImportPlanEntry,
  GrammarImportPreview,
  RowValidationError,
} from '../types/grammarImport'
import { GRAMMAR_COLUMN_LABELS, REQUIRED_GRAMMAR_COLUMNS, importedGrammarId } from '../types/grammarImport'
import { getGrammarForLevel } from '../content/contentLoader'
import { grammarImportRepository } from '../data/repositories/grammarImportRepository'
import { refreshImportedGrammarCache } from '../content/importedGrammarCache'

const SAMPLE_ROW_LIMIT = 10

/** Same normalize-then-exact-match approach as xlsxImportService — tolerant of whitespace/case, never guesses at an unrelated header. */
const HEADER_ALIASES: Record<string, CanonicalGrammarColumn> = {
  'grammar point': 'grammarPoint',
  meaning: 'meaning',
  formation: 'formation',
  usage: 'usage',
  'example sentence': 'exampleSentence',
  'example meaning': 'exampleMeaning',
  notes: 'notes',
  'common mistakes': 'commonMistakes',
  'related grammar': 'relatedGrammar',
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isXlsxFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.xlsx')
}

interface ParsedWorkbook {
  headerMap: Partial<Record<CanonicalGrammarColumn, number>>
  missingRequiredColumns: CanonicalGrammarColumn[]
  dataRows: unknown[][]
}

/**
 * Reads a grammar XLSX File entirely client-side (SheetJS), same shape as
 * xlsxImportService.parseWorkbook — deliberately NOT shared code with
 * that module (different column sets, different required columns), but
 * intentionally the same approach so the two importers behave identically
 * from the user's perspective. Only the first worksheet is read. The
 * sheet itself never carries a JLPT Level column — the level is chosen
 * once for the whole import (Phase 5 spec section 8), same as vocabulary.
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

  const headerMap: Partial<Record<CanonicalGrammarColumn, number>> = {}
  headerRow.forEach((header, index) => {
    const canonical = HEADER_ALIASES[normalizeHeader(header)]
    if (canonical && !(canonical in headerMap)) {
      headerMap[canonical] = index
    }
  })

  const missingRequiredColumns = REQUIRED_GRAMMAR_COLUMNS.filter((col) => !(col in headerMap))
  return { headerMap, missingRequiredColumns, dataRows }
}

function cellAt(row: unknown[], headerMap: ParsedWorkbook['headerMap'], col: CanonicalGrammarColumn): string {
  const index = headerMap[col]
  if (index === undefined) return ''
  return String(row[index] ?? '').trim()
}

function isBlankRow(row: unknown[], headerMap: ParsedWorkbook['headerMap']): boolean {
  return REQUIRED_GRAMMAR_COLUMNS.every((col) => cellAt(row, headerMap, col) === '')
}

interface ValidatedRow {
  row: number
  draft: GrammarImportDraft
}

function validateRows(parsed: ParsedWorkbook): { validRows: ValidatedRow[]; errors: RowValidationError[]; blankRowsSkipped: number } {
  const validRows: ValidatedRow[] = []
  const errors: RowValidationError[] = []
  let blankRowsSkipped = 0

  parsed.dataRows.forEach((row, index) => {
    const rowNumber = index + 2

    if (isBlankRow(row, parsed.headerMap)) {
      blankRowsSkipped++
      return
    }

    const draft: GrammarImportDraft = {
      grammarPoint: cellAt(row, parsed.headerMap, 'grammarPoint'),
      meaning: cellAt(row, parsed.headerMap, 'meaning'),
      formation: cellAt(row, parsed.headerMap, 'formation'),
      usage: cellAt(row, parsed.headerMap, 'usage'),
      exampleSentence: cellAt(row, parsed.headerMap, 'exampleSentence'),
      exampleMeaning: cellAt(row, parsed.headerMap, 'exampleMeaning'),
      notes: cellAt(row, parsed.headerMap, 'notes'),
      commonMistakes: cellAt(row, parsed.headerMap, 'commonMistakes'),
      relatedGrammarRaw: cellAt(row, parsed.headerMap, 'relatedGrammar'),
    }

    // Built explicitly (not via generic `draft[col]` indexing) because
    // REQUIRED_GRAMMAR_COLUMNS is typed over every CanonicalGrammarColumn
    // and one of them ('relatedGrammar') maps to a differently-named
    // draft field (relatedGrammarRaw) — REQUIRED_GRAMMAR_COLUMNS itself
    // never actually contains it, but nothing here should rely on that.
    const missing: CanonicalGrammarColumn[] = []
    if (!draft.grammarPoint) missing.push('grammarPoint')
    if (!draft.meaning) missing.push('meaning')
    if (!draft.formation) missing.push('formation')
    if (!draft.usage) missing.push('usage')
    if (missing.length > 0) {
      errors.push({ row: rowNumber, messages: missing.map((col) => `Missing ${GRAMMAR_COLUMN_LABELS[col]}`) })
      return
    }

    validRows.push({ row: rowNumber, draft })
  })

  return { validRows, errors, blankRowsSkipped }
}

/**
 * Resolves each row's comma-separated `relatedGrammarRaw` display text to
 * GrammarEntry ids, matched case-insensitively against: this same
 * import's own rows, this level's previously-imported entries, and this
 * level's bundled curated entries. A name that matches nothing is simply
 * dropped — an unresolvable related-grammar reference is not a row error,
 * since the whole field is optional free text.
 */
function resolveRelatedGrammar(rawText: string, nameToId: Map<string, string>, ownId: string): string[] {
  if (!rawText.trim()) return []
  const ids = new Set<string>()
  for (const name of rawText.split(',')) {
    const id = nameToId.get(name.trim().toLowerCase())
    if (id && id !== ownId) ids.add(id)
  }
  return Array.from(ids)
}

export const grammarXlsxImportService = {
  /**
   * Full parse -> validate -> plan pipeline, mirroring
   * xlsxImportService.buildPreview's shape exactly (spec section 8: "must
   * mirror the existing vocabulary import UX"). Reads the file entirely
   * in the browser; only *reads* from IndexedDB (existing imported
   * entries, for update-vs-create detection) — nothing is written until
   * commitImport() is called with this exact preview's plan.
   */
  async buildPreview(file: File, level: JLPTLevel): Promise<GrammarImportPreview> {
    if (!isXlsxFile(file)) {
      throw new Error('Please choose a .xlsx file.')
    }
    if (file.size === 0) {
      throw new Error('The selected file is empty.')
    }

    const buffer = await file.arrayBuffer()
    const parsed = parseWorkbook(buffer)

    if (parsed.missingRequiredColumns.length > 0) {
      const list = parsed.missingRequiredColumns.map((col) => GRAMMAR_COLUMN_LABELS[col]).join(', ')
      throw new Error(`Missing required column${parsed.missingRequiredColumns.length > 1 ? 's' : ''}: ${list}`)
    }
    if (parsed.dataRows.length === 0) {
      throw new Error('This spreadsheet has no data rows.')
    }

    const { validRows, errors, blankRowsSkipped } = validateRows(parsed)

    const bundledForLevel = getGrammarForLevel(level)
    const importedForLevel = await grammarImportRepository.getByLevel(level)
    const existingById = new Map(importedForLevel.map((entry) => [entry.id, entry]))

    // Built up as rows are processed so a row can reference an earlier row
    // in the SAME file, not just already-existing content.
    const nameToId = new Map<string, string>()
    for (const entry of bundledForLevel) nameToId.set(entry.grammarPoint.trim().toLowerCase(), entry.id)
    for (const entry of importedForLevel) nameToId.set(entry.grammarPoint.trim().toLowerCase(), entry.id)

    const seenInFile = new Map<string, number>() // id -> first row number
    const plan: GrammarImportPlanEntry[] = []

    for (const { row, draft } of validRows) {
      const id = importedGrammarId(level, draft.grammarPoint)
      nameToId.set(draft.grammarPoint.trim().toLowerCase(), id)

      const firstOccurrenceRow = seenInFile.get(id)
      if (firstOccurrenceRow !== undefined) {
        plan.push({ row, draft, id, action: 'duplicate-in-file', relatedGrammarIds: [], firstOccurrenceRow })
        continue
      }
      seenInFile.set(id, row)

      const existing = existingById.get(id)
      let action: GrammarImportPlanEntry['action']
      if (!existing) {
        action = 'create'
      } else {
        // Compares every field this import can actually change (not
        // relatedGrammar, which is resolved in a second pass below and
        // would make this comparison order-dependent) — an exact match
        // across all of them is a true no-op re-import.
        const unchanged =
          existing.meaning === draft.meaning &&
          existing.formation === draft.formation &&
          existing.usage === draft.usage &&
          (existing.notes ?? '') === draft.notes &&
          (existing.commonMistakes ?? '') === draft.commonMistakes &&
          (existing.examples[0]?.sentence ?? '') === draft.exampleSentence &&
          (existing.examples[0]?.meaning ?? '') === draft.exampleMeaning
        action = unchanged ? 'unchanged' : 'update'
      }

      plan.push({ row, draft, id, action, relatedGrammarIds: [] })
    }

    // Second pass: now that every row in this file has a stable id, related
    // grammar text can resolve against rows later in the same file too.
    for (const entry of plan) {
      if (entry.action === 'duplicate-in-file') continue
      entry.relatedGrammarIds = resolveRelatedGrammar(entry.draft.relatedGrammarRaw, nameToId, entry.id)
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
   * re-derived here. Refreshes the in-memory imported-grammar cache
   * afterward so newly-imported points show up immediately everywhere
   * (Grammar hub, lesson viewer, Quick Tips) without a page reload.
   */
  async commitImport(preview: GrammarImportPreview): Promise<GrammarImportCommitResult> {
    const result = await grammarImportRepository.commitImportPlan(preview.level, preview.plan)
    await refreshImportedGrammarCache()
    const totalForLevel = await grammarImportRepository.countByLevel(preview.level)
    return { level: preview.level, ...result, invalidCount: preview.invalidRowCount, totalForLevel }
  },
}
