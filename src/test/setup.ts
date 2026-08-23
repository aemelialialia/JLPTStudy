import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { DB_NAME, _resetDBConnectionForTests } from '../data/db'

/**
 * Every test in the suite gets a clean IndexedDB. fake-indexeddb polyfills
 * `indexedDB` globally for the whole process, so without this, data
 * written by one test would leak into the next. This also doubles as
 * part of the "IndexedDB can initialize / persist" verification: every
 * repository/service test below only passes because a real (fake)
 * IndexedDB is opened, written to, and read back successfully.
 */
beforeEach(async () => {
  await _resetDBConnectionForTests()
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })
})
