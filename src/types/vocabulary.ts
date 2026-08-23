import type { JLPTLevel } from './jlpt'

/**
 * Base vocabulary content, imported by the user from an XLSX file.
 * This corresponds directly to the four required XLSX columns — no split
 * kanji/japanese/kana fields, no example-sentence/notes fields — plus the
 * app-managed id/level/timestamps. This is treated as content the user
 * owns, not memorization state: how well the user knows a word lives
 * separately in `VocabularyStudyState` (see studyState.ts), so re-import
 * or content edits never touch — or risk clobbering — review history.
 */
export interface VocabularyItem {
  /** Stable unique id, generated at import time (crypto.randomUUID()). Preserved across re-imports of the same word. */
  id: string
  /** JLPT level this word was imported under. Chosen by the user at import time (never read from the XLSX). */
  level: JLPTLevel
  /** Japanese vocabulary exactly as normally written (kanji where applicable) — the XLSX "Vocab" column. */
  vocab: string
  /** Full hiragana reading, taken verbatim from the XLSX "Reading" column (never generated/inferred). */
  reading: string
  /** Translation/meaning — the XLSX "Meaning" column. */
  meaning: string
  /** Grammatical category, stored as provided (not restricted to a fixed enum) — the XLSX "Part of Speech" column. */
  partOfSpeech: string
  /** ISO timestamp of when this item was first imported. */
  createdAt: string
  /** ISO timestamp of the most recent content update (e.g. a re-import that changed meaning/partOfSpeech). */
  updatedAt: string
}

/**
 * Shape of a single validated row before it becomes a full VocabularyItem
 * — exactly the four fields read from the spreadsheet. Used by the XLSX
 * import service; excludes app-managed fields (id, level, timestamps).
 */
export type VocabularyDraft = Pick<VocabularyItem, 'vocab' | 'reading' | 'meaning' | 'partOfSpeech'>

/**
 * Identity key used for duplicate detection and re-import matching (see
 * xlsxImportService and vocabularyRepository.findDuplicate): level + vocab
 * + reading. Meaning/partOfSpeech are content that may legitimately be
 * corrected on re-import, so they are never part of identity — and two
 * different words can coincidentally share an English meaning, so meaning
 * alone is never sufficient either.
 */
export function vocabularyIdentityKey(level: JLPTLevel, vocab: string, reading: string): string {
  const parts = [level, vocab, reading]
  return parts.join('::')
}
