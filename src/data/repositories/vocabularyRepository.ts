import { getDB } from '../db'
import type { VocabularyItem } from '../../types/vocabulary'
import type { JLPTLevel } from '../../types/jlpt'
import type { MemorizationStatus } from '../../types/studyState'
import { createInitialStudyState } from '../../types/studyState'
import type { ImportPlanEntry, VocabularyCommitResult } from '../../types/vocabularyImport'
import { shuffled } from '../../utils/shuffle'
import { studyStateRepository } from './studyStateRepository'

export type VocabularyWithStatus = VocabularyItem & { status: MemorizationStatus }

function matchesQuery(word: VocabularyItem, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    word.vocab.toLowerCase().includes(q) ||
    word.reading.toLowerCase().includes(q) ||
    word.meaning.toLowerCase().includes(q) ||
    word.partOfSpeech.toLowerCase().includes(q)
  )
}

/**
 * All reads/writes to the `vocabulary` IndexedDB store go through this
 * module. UI components and pages must never open a transaction directly —
 * this is the seam that lets the storage engine change later (e.g. adding
 * a sync layer) without touching components. It also owns the join
 * against `studyState` needed for status-aware queries (search, filter,
 * random candidate selection), so that logic never has to live in a hook
 * or component.
 */
export const vocabularyRepository = {
  async getAll(): Promise<VocabularyItem[]> {
    const db = await getDB()
    return db.getAll('vocabulary')
  },

  async getById(id: string): Promise<VocabularyItem | undefined> {
    const db = await getDB()
    return db.get('vocabulary', id)
  },

  async getByLevel(level: JLPTLevel): Promise<VocabularyItem[]> {
    const db = await getDB()
    return db.getAllFromIndex('vocabulary', 'by-level', level)
  },

  async countByLevel(level: JLPTLevel): Promise<number> {
    const db = await getDB()
    return db.countFromIndex('vocabulary', 'by-level', level)
  },

  /**
   * Vocabulary filtered by memorization status. Status lives in the
   * separate studyState store, so this joins across both stores rather
   * than denormalizing status onto VocabularyItem itself.
   */
  async getByMemorizationStatus(
    level: JLPTLevel,
    status: MemorizationStatus,
  ): Promise<VocabularyItem[]> {
    const [words, states] = await Promise.all([
      vocabularyRepository.getByLevel(level),
      studyStateRepository.getAll(),
    ])
    const statusById = new Map(states.map((s) => [s.vocabularyId, s.status]))
    return words.filter((word) => (statusById.get(word.id) ?? 'new') === status)
  },

  async countByStatus(level: JLPTLevel, status: MemorizationStatus): Promise<number> {
    return (await vocabularyRepository.getByMemorizationStatus(level, status)).length
  },

  /** Case-insensitive substring search across vocab/reading/meaning/partOfSpeech, scoped to one level. */
  async search(level: JLPTLevel, query: string): Promise<VocabularyItem[]> {
    const words = await vocabularyRepository.getByLevel(level)
    return words.filter((word) => matchesQuery(word, query))
  },

  /**
   * Combined search + status filter with status joined in — the one query
   * the vocabulary management list screen needs. Kept here (not in the
   * UI/hook layer) so the join/filter logic stays out of components.
   */
  async listWithStatus(
    level: JLPTLevel,
    filters: { search?: string; status?: MemorizationStatus | 'all' } = {},
  ): Promise<VocabularyWithStatus[]> {
    const [words, states] = await Promise.all([
      vocabularyRepository.getByLevel(level),
      studyStateRepository.getAll(),
    ])
    const statusById = new Map(states.map((s) => [s.vocabularyId, s.status]))
    return words
      .map((word) => ({ ...word, status: statusById.get(word.id) ?? ('new' as MemorizationStatus) }))
      .filter((word) => matchesQuery(word, filters.search ?? ''))
      .filter((word) => !filters.status || filters.status === 'all' || word.status === filters.status)
  },

  /**
   * Duplicate/re-import identity lookup: level + vocab + reading (never
   * meaning alone — two different words can share an English meaning).
   * Used by the XLSX import service to decide create vs. update.
   */
  async findDuplicate(level: JLPTLevel, vocab: string, reading: string): Promise<VocabularyItem | undefined> {
    const words = await vocabularyRepository.getByLevel(level)
    return words.find((word) => word.vocab === vocab && word.reading === reading)
  },

  /**
   * Selection for a study session: "N vocabulary from a level where
   * status != memorized" (Phase 2 spec), with Phase 3's daily-rotation
   * rule layered on top (spec section 14) — among eligible words, prefer
   * ones with lower `timesSeen` and an older (or null/never) `lastReviewed`
   * before falling back to plain randomness. This is a deliberately simple
   * heuristic, not spaced repetition: the eligible pool is shuffled first
   * (so words with equal priority — e.g. every never-studied "new" word —
   * come back in a different order each time), then stably sorted by
   * priority, so a session naturally surfaces less-seen/longer-untouched
   * words first without ever being fully deterministic.
   */
  async getRandomCandidates(
    level: JLPTLevel,
    count: number,
    options: { excludeMemorized?: boolean } = {},
  ): Promise<VocabularyItem[]> {
    const excludeMemorized = options.excludeMemorized ?? true
    const words = await vocabularyRepository.getByLevel(level)
    const states = await studyStateRepository.getAll()
    const stateById = new Map(states.map((s) => [s.vocabularyId, s]))

    const pool = excludeMemorized
      ? words.filter((word) => stateById.get(word.id)?.status !== 'memorized')
      : words

    const prioritized = shuffled(pool)
      .map((word) => {
        const state = stateById.get(word.id)
        return {
          word,
          timesSeen: state?.timesSeen ?? 0,
          // Never-reviewed words sort as if reviewed at time 0 — i.e. the
          // oldest possible — so they're preferred over ones seen recently.
          lastReviewedAt: state?.lastReviewed ? Date.parse(state.lastReviewed) : 0,
        }
      })
      .sort((a, b) => a.timesSeen - b.timesSeen || a.lastReviewedAt - b.lastReviewedAt)

    return prioritized.slice(0, count).map((entry) => entry.word)
  },

  async add(item: VocabularyItem): Promise<void> {
    const db = await getDB()
    await db.put('vocabulary', item)
  },

  /** Bulk insert. Runs as a single transaction. Prefer `commitImportPlan` for XLSX imports (it also creates study state and handles updates). */
  async addMany(items: VocabularyItem[]): Promise<void> {
    if (items.length === 0) return
    const db = await getDB()
    const tx = db.transaction('vocabulary', 'readwrite')
    await Promise.all([...items.map((item) => tx.store.put(item)), tx.done])
  },

  async update(item: VocabularyItem): Promise<void> {
    const db = await getDB()
    await db.put('vocabulary', item)
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('vocabulary', id)
    // Keep study state in sync — an orphaned study-state row for a deleted
    // word would otherwise linger forever and skew future stats.
    await studyStateRepository.delete(id)
  },

  async deleteByLevel(level: JLPTLevel): Promise<void> {
    const words = await vocabularyRepository.getByLevel(level)
    const db = await getDB()
    const tx = db.transaction('vocabulary', 'readwrite')
    await Promise.all([...words.map((w) => tx.store.delete(w.id)), tx.done])
    await Promise.all(words.map((w) => studyStateRepository.delete(w.id)))
  },

  async count(): Promise<number> {
    const db = await getDB()
    return db.count('vocabulary')
  },

  /**
   * Writes a validated ImportPlanEntry[] (built by xlsxImportService's
   * buildPreview — never re-derived here) to IndexedDB in a single
   * transaction spanning both `vocabulary` and `studyState`. If any write
   * fails, the whole transaction aborts and nothing in it is persisted —
   * this is what keeps an import atomic (see project spec section 21):
   * a failure never leaves a partial set of rows imported, and never
   * touches study state for rows it didn't actually create.
   *
   * 'update' rows preserve the existing id (and therefore its study
   * state) and only overwrite content fields. If the referenced record
   * was deleted since the preview was built, that row falls back to
   * being created fresh rather than silently dropped.
   */
  async commitImportPlan(level: JLPTLevel, plan: ImportPlanEntry[]): Promise<VocabularyCommitResult> {
    const db = await getDB()
    const tx = db.transaction(['vocabulary', 'studyState'], 'readwrite')
    const vocabStore = tx.objectStore('vocabulary')
    const studyStore = tx.objectStore('studyState')
    const now = new Date().toISOString()

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
        if (entry.action === 'update' && entry.existingId) {
          const existing = await vocabStore.get(entry.existingId)
          if (existing) {
            await vocabStore.put({ ...existing, ...entry.draft, level, updatedAt: now })
            updatedCount++
            continue
          }
          // Existing record vanished since the preview was built (e.g. deleted
          // in another tab) — fall through and create it fresh instead.
        }

        // add() (not put()) deliberately: a "create" must never silently
        // overwrite an existing record. A fresh crypto.randomUUID() colliding
        // with an existing id is astronomically unlikely, but if it — or any
        // other write in this loop — ever fails, add()'s ConstraintError (or
        // any other request-level error) aborts this whole transaction and
        // rolls back every write already made within it, so a failure never
        // leaves a partial import behind.
        const id = crypto.randomUUID()
        await vocabStore.add({ id, level, ...entry.draft, createdAt: now, updatedAt: now })
        await studyStore.add(createInitialStudyState(id))
        createdCount++
      }

      await tx.done
    } catch (err) {
      // A write failing mid-loop means the transaction is aborting (or has
      // aborted) on its own; tx.done rejects with that same abort. Observe
      // it here (swallowed — the original error below is more informative)
      // so it never surfaces as an unhandled rejection after this function
      // has already thrown.
      await tx.done.catch(() => {})
      throw err
    }

    const totalForLevel = await vocabularyRepository.countByLevel(level)
    return { level, createdCount, updatedCount, unchangedCount, duplicateInFileCount, totalForLevel }
  },
}
