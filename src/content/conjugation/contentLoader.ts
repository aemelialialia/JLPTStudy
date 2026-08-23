import type { ConjugationCategory, ConjugationTable } from '../../types/conjugation'

/**
 * Bundled conjugation/reference-table content (Phase 5 spec section 10).
 *
 * DELIBERATELY EMPTY. No verb/adjective/noun/politeness conjugation
 * table content has been authored or fabricated for this project — the
 * spec is explicit that inventing this content is not acceptable. This
 * file exists purely as the loading architecture: once real reference
 * tables are provided (by the user, or hand-authored against
 * ConjugationTable's shape — see src/types/conjugation.ts), they get
 * added here as entries in CONJUGATION_TABLES, split into per-category
 * JSON files if the set grows large, exactly like
 * src/content/grammar/*.json — and nothing above this file (service,
 * hooks, Resources UI) needs to change to pick them up.
 */
const CONJUGATION_TABLES: ConjugationTable[] = []

export function getConjugationTables(category?: ConjugationCategory): ConjugationTable[] {
  return category ? CONJUGATION_TABLES.filter((table) => table.category === category) : CONJUGATION_TABLES
}

export function getConjugationTableById(id: string): ConjugationTable | undefined {
  return CONJUGATION_TABLES.find((table) => table.id === id)
}
