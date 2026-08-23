import type { JLPTLevel } from './jlpt'

/**
 * Reference-table categories for the Grammar Resources section (Phase 5
 * spec section 10). Fixed set matching what the spec explicitly asks
 * for: verb conjugation, adjective conjugation, noun/pronoun reference,
 * and plain/polite form references.
 */
export type ConjugationCategory = 'verb' | 'adjective' | 'noun' | 'politeness'

export const CONJUGATION_CATEGORIES: ConjugationCategory[] = ['verb', 'adjective', 'noun', 'politeness']

export const CONJUGATION_CATEGORY_LABELS: Record<ConjugationCategory, string> = {
  verb: 'Verb Conjugation',
  adjective: 'Adjective Conjugation',
  noun: 'Noun & Pronoun Reference',
  politeness: 'Plain / Polite Forms',
}

export const CONJUGATION_CATEGORY_ICONS: Record<ConjugationCategory, string> = {
  verb: 'sync_alt',
  adjective: 'style',
  noun: 'label',
  politeness: 'handshake',
}

/** One row of a reference table — e.g. one conjugation form with an example. */
export interface ConjugationRow {
  form: string
  example: string
  reading?: string
  meaning?: string
  notes?: string
}

/**
 * A single reference table. Bundled, curated, read-only content — the
 * same "static content" tier as GrammarEntry/GrammarQuestion (see
 * src/content/README.md), just for a content type that doesn't exist yet
 * (Phase 5 spec section 10 explicitly forbids inventing this content; see
 * src/content/conjugation/contentLoader.ts, which is intentionally empty).
 */
export interface ConjugationTable {
  id: string
  category: ConjugationCategory
  /** 'all' for a table that isn't tied to one JLPT level (e.g. a general plain/polite reference). */
  level: JLPTLevel | 'all'
  title: string
  description?: string
  rows: ConjugationRow[]
}
