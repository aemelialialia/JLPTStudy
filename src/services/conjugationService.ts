import { CONJUGATION_CATEGORIES } from '../types/conjugation'
import type { ConjugationCategory } from '../types/conjugation'
import { getConjugationTables, getConjugationTableById } from '../content/conjugation/contentLoader'

export interface ConjugationCategorySummary {
  category: ConjugationCategory
  tableCount: number
}

/**
 * Framework-agnostic access to conjugation/reference-table content,
 * mirroring how grammarLessonService sits between the UI and grammar
 * content. Currently every category is empty (see contentLoader's
 * comment) — this service's job is the architecture, not the content.
 */
export const conjugationService = {
  getCategorySummaries(): ConjugationCategorySummary[] {
    return CONJUGATION_CATEGORIES.map((category) => ({ category, tableCount: getConjugationTables(category).length }))
  },

  getTablesForCategory(category: ConjugationCategory) {
    return getConjugationTables(category)
  },

  getTable(id: string) {
    return getConjugationTableById(id)
  },
}
