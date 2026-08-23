import type { JLPTLevel } from '../types/jlpt'
import { JLPT_LEVELS } from '../types/jlpt'
import type { GrammarEntry, GrammarSlide } from '../types/grammar'
import { buildGrammarSlides, grammarSlideId } from '../types/grammar'
import { getGrammarForLevel, getGrammarEntryById } from '../content/contentLoader'
import { getImportedGrammarSync, warmImportedGrammarCache } from '../content/importedGrammarCache'
import { grammarProgressRepository } from '../data/repositories/grammarProgressRepository'

export interface GrammarLevelProgressSummary {
  level: JLPTLevel
  total: number
  studied: number
  /** IDs of studied points that still exist in the current content set — lets the UI mark individual cards/rows as studied without a second query. */
  studiedIds: string[]
}

/**
 * Framework-agnostic grammar lesson logic: browsing the level's grammar
 * points, deriving their slides, and recording/reading "studied"
 * progress. No component talks to grammarProgressRepository or the
 * content loader directly — everything goes through here, mirroring how
 * vocabularyLearningService sits between the UI and the vocabulary data
 * layer.
 */
export const grammarLessonService = {
  /**
   * Bundled (curated, read-only) points for the level plus any the user
   * has imported via the Grammar XLSX importer (Phase 5), appended after
   * the curated set. Imported points only show up once
   * warmImportedGrammarCache() has resolved at least once — fires it
   * fire-and-forget here so the cache is never left cold forever, but
   * callers that need a guaranteed-fresh read on first render should
   * also use useImportedGrammarReady() to force a re-render on warm.
   */
  getGrammarPoints(level: JLPTLevel): GrammarEntry[] {
    void warmImportedGrammarCache()
    const imported = getImportedGrammarSync().filter((entry) => entry.level === level)
    return [...getGrammarForLevel(level), ...imported]
  },

  getGrammarPoint(id: string): GrammarEntry | undefined {
    void warmImportedGrammarCache()
    return getGrammarEntryById(id) ?? getImportedGrammarSync().find((entry) => entry.id === id)
  },

  /** All lesson slides for one grammar point (bundled or imported), in order. Empty array if the id doesn't exist. */
  getSlides(grammarPointId: string): GrammarSlide[] {
    const entry = grammarLessonService.getGrammarPoint(grammarPointId)
    return entry ? buildGrammarSlides(entry) : []
  },

  /** Resolves a specific slide id (e.g. from a quiz question's lessonSlideId) back to the slide + its index within the lesson, or undefined if the grammar point/slide no longer exists. */
  resolveSlide(slideId: string): { slide: GrammarSlide; index: number; slides: GrammarSlide[] } | undefined {
    const [grammarPointId] = slideId.split('::')
    const slides = grammarLessonService.getSlides(grammarPointId)
    const index = slides.findIndex((s) => s.id === slideId)
    if (index === -1) return undefined
    return { slide: slides[index], index, slides }
  },

  /** The slide id a grammar point's lesson should open at when entered from its own browse card (not from a quiz reference) — always the first slide. */
  firstSlideId(grammarPointId: string): string {
    return grammarSlideId(grammarPointId, 'point')
  },

  /**
   * Marks a grammar point "studied" (spec section 15: based on actually
   * opening the lesson, not merely appearing in a browse list). Safe to
   * call every time a lesson mounts — the repository upsert is
   * idempotent and never double-counts.
   */
  async markStudied(grammarPointId: string): Promise<void> {
    const entry = grammarLessonService.getGrammarPoint(grammarPointId)
    if (!entry) return
    await grammarProgressRepository.markStudied(grammarPointId, entry.level)
  },

  async getLevelProgress(level: JLPTLevel): Promise<GrammarLevelProgressSummary> {
    const points = grammarLessonService.getGrammarPoints(level)
    const progress = await grammarProgressRepository.getByLevel(level)
    const progressIds = new Set(progress.map((p) => p.grammarPointId))
    // Only count studied points that still exist in the current content
    // set, so a removed/renamed point can never inflate the count past total.
    const studiedIds = points.filter((p) => progressIds.has(p.id)).map((p) => p.id)
    return { level, total: points.length, studied: studiedIds.length, studiedIds }
  },

  async getAllLevelsProgress(): Promise<GrammarLevelProgressSummary[]> {
    return Promise.all(JLPT_LEVELS.map((level) => grammarLessonService.getLevelProgress(level)))
  },
}
