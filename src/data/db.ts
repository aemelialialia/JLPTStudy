import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { VocabularyItem } from '../types/vocabulary'
import type { VocabularyStudyState } from '../types/studyState'
import type { QuizAttempt, MistakeRecord } from '../types/quiz'
import type { UserSettings, DailyStudyState } from '../types/settings'
import type { StudySession } from '../types/studySession'
import type { GrammarProgress } from '../types/grammar'
import type { GrammarQuizSession } from '../types/grammarQuizSession'

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
  studySessions: {
    key: string // StudySession.id
    value: StudySession
    indexes: { 'by-level': string }
  }
  grammarProgress: {
    key: string // GrammarProgress.grammarPointId
    value: GrammarProgress
    indexes: { 'by-level': string }
  }
  grammarQuizSessions: {
    key: string // GrammarQuizSession.id
    value: GrammarQuizSession
    indexes: { 'by-level': string }
  }
}

export const DB_NAME = 'jlpt-study-db'
// Bumped 1 -> 2 in Phase 3 (added `studySessions`), 2 -> 3 in Phase 4
// (added `grammarProgress` + `grammarQuizSessions` for the grammar
// lesson/quiz system). `openDB`'s upgrade callback only runs when the
// requested version is higher than what's already stored, so this bump
// (not just the `if (!contains)` guard below) is what makes the new
// stores actually get created for anyone with an older database already
// in their browser.
export const DB_VERSION = 3

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
        if (!db.objectStoreNames.contains('studySessions')) {
          const store = db.createObjectStore('studySessions', { keyPath: 'id' })
          store.createIndex('by-level', 'level')
        }
        if (!db.objectStoreNames.contains('grammarProgress')) {
          const store = db.createObjectStore('grammarProgress', { keyPath: 'grammarPointId' })
          store.createIndex('by-level', 'level')
        }
        if (!db.objectStoreNames.contains('grammarQuizSessions')) {
          const store = db.createObjectStore('grammarQuizSessions', { keyPath: 'id' })
          store.createIndex('by-level', 'level')
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
