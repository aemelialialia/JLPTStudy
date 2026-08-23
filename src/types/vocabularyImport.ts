import type { JLPTLevel } from './jlpt'
import type { VocabularyDraft } from './vocabulary'

/** The four canonical fields read from a vocabulary XLSX file. */
export type CanonicalVocabColumn = 'vocab' | 'reading' | 'meaning' | 'partOfSpeech'

export const VOCAB_COLUMN_LABELS: Record<CanonicalVocabColumn, string> = {
  vocab: 'Vocab',
  reading: 'Reading',
  meaning: 'Meaning',
  partOfSpeech: 'Part of Speech',
}

export interface RowValidationError {
  /** 1-based row number as it would appear in the spreadsheet (header = row 1). */
  row: number
  messages: string[]
}

/**
 * What will happen to one valid row when the plan is committed:
 * - 'create': no existing record matches (level+vocab+reading) — a new VocabularyItem + fresh study state is created.
 * - 'update': matches an existing record and at least one field (meaning/partOfSpeech) differs — content is updated, study state is untouched.
 * - 'unchanged': matches an existing record and every field is identical — a true duplicate, nothing is written.
 * - 'duplicate-in-file': repeats an earlier row in this same spreadsheet (by vocab+reading) — skipped, first occurrence wins.
 */
export type ImportRowAction = 'create' | 'update' | 'unchanged' | 'duplicate-in-file'

export interface ImportPlanEntry {
  row: number
  draft: VocabularyDraft
  action: ImportRowAction
  /** Set when action is 'update' or 'unchanged' — the id of the matching existing record. */
  existingId?: string
  /** Set when action is 'duplicate-in-file' — the row number of the earlier occurrence it duplicates. */
  firstOccurrenceRow?: number
}

/**
 * Computed entirely without touching IndexedDB for writes (only reads, to
 * check for existing matches) — nothing is persisted until commitImport()
 * is called with this exact object's `plan`.
 */
export interface ImportPreview {
  level: JLPTLevel
  fileName: string
  fileSizeBytes: number
  /** Data rows present in the sheet, excluding the header row and fully-blank rows. */
  totalRows: number
  blankRowsSkipped: number
  validRowCount: number
  invalidRowCount: number
  /** Valid rows that repeat an earlier row in this same file (by vocab+reading). */
  duplicateInFileCount: number
  /** Valid, non-in-file-duplicate rows with no matching existing record — will be created. */
  newCount: number
  /** Valid, non-in-file-duplicate rows that match an existing record (whether or not content differs). */
  existingCount: number
  errors: RowValidationError[]
  /** First few valid rows, for the preview table. */
  sampleRows: VocabularyDraft[]
  /** Full per-row plan — passed back to commitImport() unchanged. */
  plan: ImportPlanEntry[]
}

/** Result of writing a plan to IndexedDB, before the row-validation-error count is merged back in by the caller. */
export interface VocabularyCommitResult {
  level: JLPTLevel
  createdCount: number
  updatedCount: number
  unchangedCount: number
  duplicateInFileCount: number
  /** Actual vocabulary count for this level after the import, read back from IndexedDB — never assumed. */
  totalForLevel: number
}

export interface ImportCommitResult extends VocabularyCommitResult {
  invalidCount: number
}
