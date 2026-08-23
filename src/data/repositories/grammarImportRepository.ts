import { getDB } from '../db'
import type { GrammarEntry } from '../../types/grammar'
import type { JLPTLevel } from '../../types/jlpt'
import type { GrammarImportPlanEntry } from '../../types/grammarImport'

/**
 * All reads/writes to the `userGrammarEntries` IndexedDB store — the
 * user's own imported grammar points, kept separate from the bundled
 * curated content in src/content (which stays read-only, per its own
 * doc). Mirrors vocabularyRepository's shape for the same reason: one
 * seam between IndexedDB and everything else.
 */
export const grammarImportRepository = {
  async getAll(): Promise<GrammarEntry[]> {
    const db = await getDB()
    return db.getAll('userGrammarEntries')
  },

  async getByLevel(level: JLPTLevel): Promise<GrammarEntry[]> {
    const db = await getDB()
    return db.getAllFromIndex('userGrammarEntries', 'by-level', level)
  },

  async getById(id: string): Promise<GrammarEntry | undefined> {
    const db = await getDB()
    return db.get('userGrammarEntries', id)
  },

  async countByLevel(level: JLPTLevel): Promise<number> {
    const db = await getDB()
    return db.countFromIndex('userGrammarEntries', 'by-level', level)
  },

  /**
   * Writes a validated GrammarImportPlanEntry[] (built by
   * grammarXlsxImportService's buildPreview — never re-derived here) to
   * IndexedDB in a single transaction. A row's `id` is the same
   * deterministic importedGrammarId() the preview already computed, so
   * 'create' and 'update' both simply `put()` at that id — re-importing
   * the same grammar point (even from a different file) always resolves
   * to the same record instead of duplicating it. If any write fails,
   * the whole transaction aborts and nothing in it is persisted.
   */
  async commitImportPlan(
    level: JLPTLevel,
    plan: GrammarImportPlanEntry[],
  ): Promise<{ createdCount: number; updatedCount: number; unchangedCount: number; duplicateInFileCount: number }> {
    const db = await getDB()
    const tx = db.transaction('userGrammarEntries', 'readwrite')
    const store = tx.objectStore('userGrammarEntries')

    let createdCount = 0
    let updatedCount = 0
    let unchangedCount = 0
    let duplicateInFileCount = 0

    try {
      for (const entry of plan) {
        if (entry.action === 'duplicate-in-file') {
          duplicateInFileCount++
          continue
        }
        if (entry.action === 'unchanged') {
          unchangedCount++
          continue
        }

        const grammarEntry: GrammarEntry = {
          id: entry.id,
          level,
          grammarPoint: entry.draft.grammarPoint,
          meaning: entry.draft.meaning,
          formation: entry.draft.formation,
          usage: entry.draft.usage,
          examples: entry.draft.exampleSentence
            ? [{ sentence: entry.draft.exampleSentence, meaning: entry.draft.exampleMeaning }]
            : [],
          notes: entry.draft.notes,
          commonMistakes: entry.draft.commonMistakes,
          relatedGrammar: entry.relatedGrammarIds,
        }
        await store.put(grammarEntry)
        if (entry.action === 'create') createdCount++
        else updatedCount++
      }

      await tx.done
    } catch (err) {
      await tx.done.catch(() => {})
      throw err
    }

    return { createdCount, updatedCount, unchangedCount, duplicateInFileCount }
  },
}
