import type { JLPTLevel } from './jlpt'

/** A single usage example attached to a grammar point. */
export interface GrammarExample {
  sentence: string
  meaning: string
  reading?: string
}

/**
 * Curated grammar content. Unlike vocabulary, grammar notes are NOT
 * user-imported — they are structured content files bundled with the
 * app (see src/content/grammar/*.json) and loaded read-only at runtime.
 * This type is the schema for those JSON files.
 */
export interface GrammarEntry {
  id: string
  level: JLPTLevel
  grammarPoint: string
  meaning: string
  formation: string
  usage: string
  examples: GrammarExample[]
  notes?: string
  commonMistakes?: string
  /** IDs of other GrammarEntry records this point is commonly confused with or builds on. */
  relatedGrammar: string[]
  /**
   * The fields below come from the Grammar XLSX importer's schema (see
   * src/types/grammarImport.ts) — required on every freshly-imported
   * entry, but optional on this type since the curated bundled JSON
   * (src/content/grammar/*.json) predates them and never sets them.
   */
  /** Broad category, e.g. "Particles" / "Verb Conjugation" / "Request" — stored verbatim, never forced into a fixed list. */
  category?: string
  /** Study priority exactly as supplied by the source spreadsheet (e.g. High/Medium/Low) — preserved verbatim, never normalized to a different scale. */
  priority?: string
  /** Cross-reference to Minna no Nihongo lesson(s), free text (e.g. "Lesson 3", "Lessons 20-21") — never inferred, only ever what the spreadsheet supplied. */
  minnaNoNihongoLessons?: string
  /** Cross-reference to New Concept Japanese material, free text — same rule: never inferred. */
  newConceptJapaneseCoverage?: string
  /**
   * Content/source metadata from the imported spreadsheet's "Mastery"
   * column — NOT the user's actual live study/mastery state. The app's
   * own quiz-derived mastery lives entirely in MistakeRecord (keyed by
   * question, not grammar point) and must never be overwritten by this
   * field or by a re-import; kept under a distinct name specifically so
   * the two concepts can never be confused in code.
   */
  sourceMastery?: string
}

/**
 * The kind of content a lesson slide holds — used only to pick a title/
 * layout in the UI, never to force every grammar point through an
 * identical slide count (spec section 5: "do not force every grammar
 * point into an identical slide structure if the content does not
 * require it").
 */
export type GrammarSlideType =
  | 'point'
  | 'reference'
  | 'formation'
  | 'usage'
  | 'examples'
  | 'notes'
  | 'mistakes'
  | 'practice'

/**
 * A single slide within a grammar point's lesson (spec section 5-6).
 * Slides are NOT stored as separate content — they are deterministically
 * derived from a GrammarEntry's fields by `buildGrammarSlides` below, so
 * content authors only ever edit the flat GrammarEntry JSON. Each slide's
 * `id` is stable and predictable (`${grammarPointId}::${type}`), which is
 * what lets a GrammarQuestion's `lessonSlideId` deep-link to an exact
 * slide without needing separately-authored slide content.
 */
export interface GrammarSlide {
  id: string
  grammarPointId: string
  order: number
  type: GrammarSlideType
  title: string
  content: string
  examples: GrammarExample[]
  notes?: string
  /** Label/value reference pairs — used only by the 'reference' slide type, to surface Category/Priority/Minna no Nihongo/New Concept Japanese/source-Mastery metadata without inventing a new slide layout per field. */
  meta?: { label: string; value: string }[]
}

const SLIDE_TITLES: Record<GrammarSlideType, string> = {
  point: 'Grammar Point',
  reference: 'Study Reference',
  formation: 'Formation',
  usage: 'Usage',
  examples: 'Example Sentences',
  notes: 'Important Notes',
  mistakes: 'Common Mistakes',
  practice: 'Quick Practice',
}

/** Builds `${grammarPointId}::${type}` — the one place a slide id is constructed, so lessonSlideId references and the slide builder can never drift apart. */
export function grammarSlideId(grammarPointId: string, type: GrammarSlideType): string {
  return `${grammarPointId}::${type}`
}

/**
 * Deterministically derives a grammar point's lesson slides from its flat
 * content fields. Every entry gets a 'point' intro slide and a final
 * 'practice' slide; the slides in between are included only when the
 * entry actually has content for them, so a sparse entry naturally
 * produces a shorter lesson instead of empty/placeholder slides.
 */
export function buildGrammarSlides(entry: GrammarEntry): GrammarSlide[] {
  const slides: GrammarSlide[] = []
  let order = 0

  const push = (type: GrammarSlideType, content: string, examples: GrammarExample[] = [], notes?: string, meta?: { label: string; value: string }[]) => {
    slides.push({
      id: grammarSlideId(entry.id, type),
      grammarPointId: entry.id,
      order: order++,
      type,
      title: SLIDE_TITLES[type],
      content,
      examples,
      notes,
      meta,
    })
  }

  push('point', entry.meaning)

  // A quick-reference slide of the imported-grammar metadata fields
  // (Category/Priority/Minna no Nihongo/New Concept Japanese/source
  // Mastery) — only included when at least one is actually present, so
  // bundled entries authored before this schema existed never grow an
  // empty slide.
  const meta: { label: string; value: string }[] = []
  if (entry.category?.trim()) meta.push({ label: 'Category', value: entry.category })
  if (entry.priority?.trim()) meta.push({ label: 'Priority', value: entry.priority })
  if (entry.minnaNoNihongoLessons?.trim()) meta.push({ label: 'Minna no Nihongo', value: entry.minnaNoNihongoLessons })
  if (entry.newConceptJapaneseCoverage?.trim()) meta.push({ label: 'New Concept Japanese', value: entry.newConceptJapaneseCoverage })
  if (entry.sourceMastery?.trim()) meta.push({ label: 'Source Mastery', value: entry.sourceMastery })
  if (meta.length > 0) push('reference', '', [], undefined, meta)

  if (entry.formation.trim()) push('formation', entry.formation)
  if (entry.usage.trim()) push('usage', entry.usage)
  if (entry.examples.length > 0) push('examples', '', entry.examples)
  if (entry.notes?.trim()) push('notes', entry.notes)
  if (entry.commonMistakes?.trim()) push('mistakes', entry.commonMistakes)
  push('practice', `Ready to check your understanding of ${entry.grammarPoint}?`)

  return slides
}

/**
 * Per-grammar-point study progress (spec section 15/16). A point counts
 * as "studied" only once the user has actually opened its lesson — never
 * just for appearing in a browse list — and is recorded once per point
 * (idempotent upsert keyed by grammarPointId), so revisiting a lesson
 * never inflates the count.
 */
export interface GrammarProgress {
  grammarPointId: string
  level: JLPTLevel
  /** ISO timestamp of the first time this point's lesson was opened. */
  firstStudiedAt: string
  /** ISO timestamp of the most recent time this point's lesson was opened. */
  lastStudiedAt: string
  timesQuizzed: number
  timesQuizCorrect: number
}
