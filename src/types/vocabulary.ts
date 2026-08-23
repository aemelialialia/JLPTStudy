import type { JLPTLevel } from './jlpt'

/**
 * Base vocabulary content, imported by the user from an XLSX file.
 * This is treated as (mostly) immutable content once imported: the fields
 * here describe the word itself, never how well the user knows it.
 * Memorization/study progress lives separately in `VocabularyStudyState`
 * (see studyState.ts) so that re-importing or editing a word never has to
 * touch — or risk clobbering — the user's review history.
 */
export interface VocabularyItem {
  /** Stable unique id, generated at import time (crypto.randomUUID()). */
  id: string
  /** The headword as commonly written/spoken (may equal kanji or kana). */
  japanese: string
  /** Kanji form, if applicable. Empty string when the word is kana-only. */
  kanji: string
  /** Kana reading. */
  kana: string
  /** English (or user's chosen language) meaning/definition. */
  meaning: string
  /** Part of speech, e.g. "noun", "godan verb", "na-adjective". */
  partOfSpeech: string
  /** Optional example sentence in Japanese. */
  exampleSentence?: string
  /** Optional translation of the example sentence. */
  exampleMeaning?: string
  /** Optional free-form notes. */
  notes?: string
  /** JLPT level this word was imported under. Chosen by the user at import time. */
  level: JLPTLevel
  /** ISO timestamp of when this item was imported. */
  createdAt: string
}

/**
 * Shape of a single validated row before it becomes a full VocabularyItem.
 * Used by the XLSX import service; deliberately excludes app-managed
 * fields (id, level, createdAt) which are not read from the spreadsheet.
 */
export type VocabularyDraft = Omit<VocabularyItem, 'id' | 'level' | 'createdAt'>
