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
import { ALL_GRAMMAR_COLUMNS, GRAMMAR_COLUMN_LABELS, REQUIRED_GRAMMAR_COLUMNS, importedGrammarId } from '../types/grammarImport'
import { grammarImportRepository } from '../data/repositories/grammarImportRepository'
import { importedFilesRepository } from '../data/repositories/importedFilesRepository'
import { refreshImportedGrammarCache } from '../content/importedGrammarCache'

const SAMPLE_ROW_LIMIT = 10

/**
 * Same normalize-then-exact-match approach as xlsxImportService — tolerant
 * of whitespace/case, never guesses at an unrelated header. The keys here
 * are the lowercased, whitespace-collapsed form of GRAMMAR_COLUMN_LABELS'
 * exact header text; the *displayed* labels (error messages, preview
 * table, section copy) always come from GRAMMAR_COLUMN_LABELS itself, so
 * the app never renames these columns even though matching is lenient.
 */
const HEADER_ALIASES: Record<string, CanonicalGrammarColumn> = {
  category: 'category',
  'grammar point': 'grammarPoint',
  'formation / structure': 'formation',
  'english meaning': 'meaning',
  'core usage': 'usage',
  'minna no nihongo lesson(s)': 'minnaNoNihongoLessons',
  'new concept japanese coverage': 'newConceptJapaneseCoverage',
  priority: 'priority',
  notes: 'notes',
  mastery: 'sourceMastery',
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
 * once for the whole import, same as vocabulary.
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

/** "Completely blank" (spec: "Ignore completely blank rows") means every recognized column is empty, not just the required ones — a row with only a stray Note filled in is not blank, it's an invalid row missing its required fields. */
function isBlankRow(row: unknown[], headerMap: ParsedWorkbook['headerMap']): boolean {
  return ALL_GRAMMAR_COLUMNS.every((col) => cellAt(row, headerMap, col) === '')
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
      category: cellAt(row, parsed.headerMap, 'category'),
      grammarPoint: cellAt(row, parsed.headerMap, 'grammarPoint'),
      formation: cellAt(row, parsed.headerMap, 'formation'),
      meaning: cellAt(row, parsed.headerMap, 'meaning'),
      usage: cellAt(row, parsed.headerMap, 'usage'),
      minnaNoNihongoLessons: cellAt(row, parsed.headerMap, 'minnaNoNihongoLessons'),
      newConceptJapaneseCoverage: cellAt(row, parsed.headerMap, 'newConceptJapaneseCoverage'),
      priority: cellAt(row, parsed.headerMap, 'priority'),
      notes: cellAt(row, parsed.headerMap, 'notes'),
      sourceMastery: cellAt(row, parsed.headerMap, 'sourceMastery'),
    }

    // Every CanonicalGrammarColumn key matches its GrammarImportDraft field
    // name 1:1 in this schema (unlike the pre-revision one), so generic
    // indexing is safe here.
    const missing = REQUIRED_GRAMMAR_COLUMNS.filter((col) => !draft[col])
    if (missing.length > 0) {
      errors.push({ row: rowNumber, messages: missing.map((col) => `Missing ${GRAMMAR_COLUMN_LABELS[col]}`) })
      return
    }

    validRows.push({ row: rowNumber, draft })
  })

  return { validRows, errors, blankRowsSkipped }
}

export const grammarXlsxImportService = {
  /**
   * Full parse -> validate -> plan pipeline, mirroring
   * xlsxImportService.buildPreview's shape exactly ("mirror the existing
   * vocabulary import UX exactly"). Reads the file entirely in the
   * browser; only *reads* from IndexedDB (existing imported entries, for
   * update-vs-create detection) — nothing is written until commitImport()
   * is called with this exact preview's plan.
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

    // Duplicate/update matching is scoped to this level's previously
    // IMPORTED points only (bundled curated content lives in a completely
    // separate id space and is never touched by an import) — per the
    // duplicate-handling rule, primarily keyed on (level, Grammar Point).
    const importedForLevel = await grammarImportRepository.getByLevel(level)
    const existingById = new Map(importedForLevel.map((entry) => [entry.id, entry]))

    const seenInFile = new Map<string, number>() // id -> first row number
    const plan: GrammarImportPlanEntry[] = []

    for (const { row, draft } of validRows) {
      const id = importedGrammarId(level, draft.grammarPoint)

      const firstOccurrenceRow = seenInFile.get(id)
      if (firstOccurrenceRow !== undefined) {
        plan.push({ row, draft, id, action: 'duplicate-in-file', firstOccurrenceRow })
        continue
      }
      seenInFile.set(id, row)

      const existing = existingById.get(id)
      let action: GrammarImportPlanEntry['action']
      if (!existing) {
        action = 'create'
      } else {
        // Compares every field this import can actually change. grammarPoint
        // itself is deliberately excluded — it's baked into the identity id,
        // so a genuine text change (beyond trim/case) would already resolve
        // to a different id and become a 'create', not an 'update'.
        const unchanged =
          (existing.category ?? '') === draft.category &&
          existing.formation === draft.formation &&
          existing.meaning === draft.meaning &&
          existing.usage === draft.usage &&
          (existing.minnaNoNihongoLessons ?? '') === draft.minnaNoNihongoLessons &&
          (existing.newConceptJapaneseCoverage ?? '') === draft.newConceptJapaneseCoverage &&
          (existing.priority ?? '') === draft.priority &&
          (existing.notes ?? '') === draft.notes &&
          (existing.sourceMastery ?? '') === draft.sourceMastery
        action = unchanged ? 'unchanged' : 'update'
      }

      plan.push({ row, draft, id, action })
    }

    const duplicateInFileCount = plan.filter((e) => e.action === 'duplicate-in-file').length
    const newCount = plan.filter((e) => e.action === 'create').length
    const updateCount = plan.filter((e) => e.action === 'update').length
    const unchangedCount = plan.filter((e) => e.action === 'unchanged').length
    const existingCount = updateCount + unchangedCount
    const duplicateCount = duplicateInFileCount + existingCount

    return {
      level,
      fileName: file.name,
      fileSizeBytes: file.size,
      totalRows: parsed.dataRows.length,
      blankRowsSkipped,
      grammarPointCount: validRows.length + errors.length,
      validRowCount: validRows.length,
      invalidRowCount: errors.length,
      duplicateInFileCount,
      newCount,
      updateCount,
      unchangedCount,
      existingCount,
      duplicateCount,
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
    // Records the file name for Settings' "Uploaded Files" list, mirroring
    // xlsxImportService's own commitImport.
    await importedFilesRepository.recordImport('grammar', preview.level, preview.fileName)
    const totalForLevel = await grammarImportRepository.countByLevel(preview.level)
    return { level: preview.level, ...result, invalidCount: preview.invalidRowCount, totalForLevel }
  },
}
