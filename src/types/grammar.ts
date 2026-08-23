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
}

const SLIDE_TITLES: Record<GrammarSlideType, string> = {
  point: 'Grammar Point',
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

  const push = (type: GrammarSlideType, content: string, examples: GrammarExample[] = [], notes?: string) => {
    slides.push({
      id: grammarSlideId(entry.id, type),
      grammarPointId: entry.id,
      order: order++,
      type,
      title: SLIDE_TITLES[type],
      content,
      examples,
      notes,
    })
  }

  push('point', entry.meaning)
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
