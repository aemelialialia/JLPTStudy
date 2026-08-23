import { getDB } from '../db'
import type { VocabularyItem } from '../../types/vocabulary'
import type { JLPTLevel } from '../../types/jlpt'
import type { MemorizationStatus } from '../../types/studyState'
import { studyStateRepository } from './studyStateRepository'

/**
 * All reads/writes to the `vocabulary` IndexedDB store go through this
 * module. UI components and pages must never open a transaction directly —
 * this is the seam that lets the storage engine change later (e.g. adding
 * a sync layer) without touching components.
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

  async add(item: VocabularyItem): Promise<void> {
    const db = await getDB()
    await db.put('vocabulary', item)
  },

  /** Bulk insert used by the XLSX import flow. Runs as a single transaction. */
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
}
