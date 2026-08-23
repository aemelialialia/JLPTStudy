import type { JLPTLevel } from './jlpt'
import { stableHash } from '../utils/hash'

/**
 * The columns read from a grammar XLSX file. This schema was revised after
 * the original Phase 5 shape (Grammar Point/Meaning/Formation/Usage/
 * Example Sentence/Example Meaning/Notes/Common Mistakes/Related Grammar)
 * to match a specific real-world study-tracking spreadsheet format —
 * Category, Grammar Point, Formation/Structure, English Meaning, Core
 * Usage, Minna no Nihongo Lesson(s), New Concept Japanese Coverage,
 * Priority, Notes, Mastery. These exact header strings are what the
 * importer recognizes and what GRAMMAR_COLUMN_LABELS shows back to the
 * user everywhere (error messages, preview table, section copy) — they
 * are never renamed/shortened in the UI. The spreadsheet itself still
 * carries no JLPT Level column — the user picks the level once for the
 * whole import, exactly like the vocabulary importer.
 *
 * Every CanonicalGrammarColumn key matches its GrammarImportDraft field
 * name 1:1 (unlike the pre-revision schema, which had one irregular
 * relatedGrammar -> relatedGrammarRaw mapping) — this lets validation use
 * generic `draft[col]` indexing throughout.
 */
export type CanonicalGrammarColumn =
  | 'category'
  | 'grammarPoint'
  | 'formation'
  | 'meaning'
  | 'usage'
  | 'minnaNoNihongoLessons'
  | 'newConceptJapaneseCoverage'
  | 'priority'
  | 'notes'
  | 'sourceMastery'

export const GRAMMAR_COLUMN_LABELS: Record<CanonicalGrammarColumn, string> = {
  category: 'Category',
  grammarPoint: 'Grammar Point',
  formation: 'Formation / Structure',
  meaning: 'English Meaning',
  usage: 'Core Usage',
  minnaNoNihongoLessons: 'Minna no Nihongo Lesson(s)',
  newConceptJapaneseCoverage: 'New Concept Japanese Coverage',
  priority: 'Priority',
  notes: 'Notes',
  sourceMastery: 'Mastery',
}

/** Every recognized column, in the exact order the spreadsheet defines them. */
export const ALL_GRAMMAR_COLUMNS: CanonicalGrammarColumn[] = [
  'category',
  'grammarPoint',
  'formation',
  'meaning',
  'usage',
  'minnaNoNihongoLessons',
  'newConceptJapaneseCoverage',
  'priority',
  'notes',
  'sourceMastery',
]

/** Category, Grammar Point, Formation/Structure, English Meaning, Core Usage, and Priority must be present on every row; the rest may be blank. */
export const REQUIRED_GRAMMAR_COLUMNS: CanonicalGrammarColumn[] = ['category', 'grammarPoint', 'formation', 'meaning', 'usage', 'priority']

export interface RowValidationError {
  /** 1-based row number as it would appear in the spreadsheet (header = row 1). */
  row: number
  messages: string[]
}

/** The row's raw field values, exactly as typed in the spreadsheet (trimmed) — nothing here is generated, inferred, or rewritten. */
export interface GrammarImportDraft {
  category: string
  grammarPoint: string
  formation: string
  meaning: string
  usage: string
  minnaNoNihongoLessons: string
  newConceptJapaneseCoverage: string
  priority: string
  notes: string
  /**
   * The spreadsheet's own "Mastery" column — source/content metadata
   * only. Never confused with the app's real, quiz-derived mastery state
   * (which lives entirely in MistakeRecord, keyed by question, and is
   * never touched by a grammar import).
   */
  sourceMastery: string
}

export type GrammarImportRowAction = 'create' | 'update' | 'unchanged' | 'duplicate-in-file'

export interface GrammarImportPlanEntry {
  row: number
  draft: GrammarImportDraft
  /** Stable id this row resolves to — see importedGrammarId() below. Always the same for the same (level, grammarPoint) pair, which is what makes 'update' vs 'create' possible. */
  id: string
  action: GrammarImportRowAction
  /** Set when action is 'duplicate-in-file' — the row number of the earlier occurrence it duplicates. */
  firstOccurrenceRow?: number
}

export interface GrammarImportPreview {
  level: JLPTLevel
  fileName: string
  fileSizeBytes: number
  /** All raw data rows in the sheet, including blank ones. */
  totalRows: number
  blankRowsSkipped: number
  /** totalRows - blankRowsSkipped (i.e. validRowCount + invalidRowCount) — "Grammar Points" in the preview summary card. */
  grammarPointCount: number
  validRowCount: number
  invalidRowCount: number
  duplicateInFileCount: number
  newCount: number
  updateCount: number
  unchangedCount: number
  /** updateCount + unchangedCount — every valid row that matched an already-imported grammar point. */
  existingCount: number
  /** duplicateInFileCount + existingCount — "Duplicates" in the preview summary card: every row that did NOT result in a brand-new grammar point. */
  duplicateCount: number
  errors: RowValidationError[]
  /** First few valid rows, for the preview table. */
  sampleRows: GrammarImportDraft[]
  /** Full per-row plan — passed back to commitImport() unchanged. Nothing is written to IndexedDB until this exact plan is confirmed. */
  plan: GrammarImportPlanEntry[]
}

export interface GrammarImportCommitResult {
  level: JLPTLevel
  createdCount: number
  updatedCount: number
  unchangedCount: number
  duplicateInFileCount: number
  invalidCount: number
  /** Actual imported-grammar count for this level after the import, read back from IndexedDB. */
  totalForLevel: number
}

/**
 * The stable, content-derived id an imported grammar point gets:
 * `import-<level>-<hash(normalized grammar point)>`. Deterministic in
 * both level and grammar-point text, so re-importing the same point
 * (even from a different file, even after editing other fields) resolves
 * to the SAME id and becomes an 'update', never a duplicate. Matching is
 * primarily (level, Grammar Point) per the duplicate-handling spec —
 * Category/Formation are never consulted for identity, only compared
 * afterward to decide 'unchanged' vs 'update'.
 */
export function importedGrammarId(level: JLPTLevel, grammarPoint: string): string {
  const normalized = grammarPoint.trim().toLowerCase()
  return `import-${level.toLowerCase()}-${stableHash(normalized)}`
}
