import type { JLPTLevel } from './jlpt'
import { stableHash } from '../utils/hash'

/**
 * The columns read from a grammar XLSX file (Phase 5 spec section 8).
 * Deliberately mirrors vocabularyImport.ts's CanonicalVocabColumn shape —
 * same normalize/alias/validate/preview/commit pipeline, different field
 * set. The spreadsheet itself carries no JLPT Level column — the user
 * picks the level once for the whole import (spec section 8), exactly
 * like the vocabulary importer.
 */
export type CanonicalGrammarColumn =
  | 'grammarPoint'
  | 'meaning'
  | 'formation'
  | 'usage'
  | 'exampleSentence'
  | 'exampleMeaning'
  | 'notes'
  | 'commonMistakes'
  | 'relatedGrammar'

export const GRAMMAR_COLUMN_LABELS: Record<CanonicalGrammarColumn, string> = {
  grammarPoint: 'Grammar Point',
  meaning: 'Meaning',
  formation: 'Formation',
  usage: 'Usage',
  exampleSentence: 'Example Sentence',
  exampleMeaning: 'Example Meaning',
  notes: 'Notes',
  commonMistakes: 'Common Mistakes',
  relatedGrammar: 'Related Grammar',
}

/** Grammar Point/Meaning/Formation/Usage are the fields GrammarEntry (and the lesson slide builder) actually renders as core content — everything else is optional, same "required vs optional" split as GrammarEntry's own type. */
export const REQUIRED_GRAMMAR_COLUMNS: CanonicalGrammarColumn[] = ['grammarPoint', 'meaning', 'formation', 'usage']

export interface RowValidationError {
  /** 1-based row number as it would appear in the spreadsheet (header = row 1). */
  row: number
  messages: string[]
}

/** The row's raw field values, before relatedGrammar text is resolved to ids. */
export interface GrammarImportDraft {
  grammarPoint: string
  meaning: string
  formation: string
  usage: string
  exampleSentence: string
  exampleMeaning: string
  notes: string
  commonMistakes: string
  /** Comma-separated grammar point display text as typed in the spreadsheet — resolved to GrammarEntry ids at commit time (see resolveRelatedGrammar in grammarXlsxImportService), matched against other entries in this level (bundled, previously imported, and this same import). Names that don't match anything are dropped, not treated as errors. */
  relatedGrammarRaw: string
}

export type GrammarImportRowAction = 'create' | 'update' | 'unchanged' | 'duplicate-in-file'

export interface GrammarImportPlanEntry {
  row: number
  draft: GrammarImportDraft
  /** Stable id this row resolves to — see importedGrammarId() below. Always the same for the same (level, grammarPoint) pair, which is what makes 'update' vs 'create' possible. */
  id: string
  action: GrammarImportRowAction
  /** draft.relatedGrammarRaw resolved to GrammarEntry ids (bundled or imported, matched by grammarPoint text within this level) — computed once during buildPreview so commitImport never has to re-resolve anything. Names that didn't match anything are simply absent. */
  relatedGrammarIds: string[]
  /** Set when action is 'duplicate-in-file' — the row number of the earlier occurrence it duplicates. */
  firstOccurrenceRow?: number
}

export interface GrammarImportPreview {
  level: JLPTLevel
  fileName: string
  fileSizeBytes: number
  totalRows: number
  blankRowsSkipped: number
  validRowCount: number
  invalidRowCount: number
  duplicateInFileCount: number
  newCount: number
  existingCount: number
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
 * to the SAME id and becomes an 'update', never a duplicate — the same
 * identity guarantee vocabularyIdentityKey gives the vocabulary importer,
 * just also serving directly as the primary key here (GrammarEntry.id
 * must be stable and unique per spec section 9) rather than a separate
 * lookup key.
 */
export function importedGrammarId(level: JLPTLevel, grammarPoint: string): string {
  const normalized = grammarPoint.trim().toLowerCase()
  return `import-${level.toLowerCase()}-${stableHash(normalized)}`
}
