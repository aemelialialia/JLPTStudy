import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { VocabularyItem } from '../types/vocabulary'
import type { VocabularyStudyState } from '../types/studyState'
import type { QuizAttempt, MistakeRecord } from '../types/quiz'
import type { UserSettings, DailyStudyState } from '../types/settings'

/**
 * Single source of truth for the IndexedDB schema. Nothing outside
 * `src/data/` should import `idb` directly or open the database itself —
 * repositories (in `src/data/repositories/`) are the only code that talks
 * to this module, which keeps every other layer (services, hooks, UI)
 * free of IndexedDB-specific code and easy to test with mocks.
 */
export interface JLPTStudyDB extends DBSchema {
  vocabulary: {
    key: string // VocabularyItem.id
    value: VocabularyItem
    indexes: { 'by-level': string }
  }
  studyState: {
    key: string // VocabularyStudyState.vocabularyId
    value: VocabularyStudyState
    indexes: { 'by-status': string }
  }
  quizAttempts: {
    key: string // QuizAttempt.id
    value: QuizAttempt
    indexes: { 'by-level': string; 'by-question': string }
  }
  mistakes: {
    key: string // MistakeRecord.id
    value: MistakeRecord
    // No index on `mastered`: IndexedDB keys/index values must be a valid
    // IDB key type (string/number/Date/binary/array) and booleans aren't
    // one, so filtering by mastered is done in-memory in quizRepository —
    // perfectly fine at the scale of one person's mistake history.
    indexes: { 'by-level': string }
  }
  settings: {
    key: string
    value: UserSettings & { key: string }
  }
  dailyStudyState: {
    key: string // DailyStudyState.date
    value: DailyStudyState
  }
}

export const DB_NAME = 'jlpt-study-db'
export const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<JLPTStudyDB>> | null = null

/**
 * Lazily opens (and memoizes) the single IndexedDB connection for the app.
 * Safe to call from multiple repositories concurrently — `idb`/the
 * browser handle overlapping `openDB` calls, but memoizing here avoids
 * redundant upgrade-transaction churn.
 */
export function getDB(): Promise<IDBPDatabase<JLPTStudyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JLPTStudyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('vocabulary')) {
          const store = db.createObjectStore('vocabulary', { keyPath: 'id' })
          store.createIndex('by-level', 'level')
        }
        if (!db.objectStoreNames.contains('studyState')) {
          const store = db.createObjectStore('studyState', { keyPath: 'vocabularyId' })
          store.createIndex('by-status', 'status')
        }
        if (!db.objectStoreNames.contains('quizAttempts')) {
          const store = db.createObjectStore('quizAttempts', { keyPath: 'id' })
          store.createIndex('by-level', 'level')
          store.createIndex('by-question', 'questionId')
        }
        if (!db.objectStoreNames.contains('mistakes')) {
          const store = db.createObjectStore('mistakes', { keyPath: 'id' })
          store.createIndex('by-level', 'level')
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('dailyStudyState')) {
          db.createObjectStore('dailyStudyState', { keyPath: 'date' })
        }
      },
    })
  }
  return dbPromise
}

/**
 * Test-only: closes the current connection (if any) and forces the next
 * getDB() call to reopen the database. Closing matters — an unclosed
 * connection left open by a previous test blocks any subsequent
 * `indexedDB.deleteDatabase()` call (used between tests to isolate them)
 * indefinitely, since IndexedDB won't delete a database while any
 * connection to it is still open.
 */
export async function _resetDBConnectionForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
  }
  dbPromise = null
}
