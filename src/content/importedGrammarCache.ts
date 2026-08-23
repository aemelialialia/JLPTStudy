import type { GrammarEntry } from '../types/grammar'
import { grammarImportRepository } from '../data/repositories/grammarImportRepository'

/**
 * In-memory mirror of the `userGrammarEntries` IndexedDB store, so that
 * grammarLessonService (and everything built on it — GrammarHubPage,
 * GrammarPointList, the lesson viewer, Quick Tips, ...) can keep reading
 * imported grammar points SYNCHRONOUSLY, exactly like it already reads
 * the bundled JSON via contentLoader.ts. contentLoader.ts itself stays
 * untouched and purely bundled/read-only, per its own documented
 * contract ("not user data... never written to") — this is a separate,
 * new seam specifically for Phase 5's user-imported grammar content, not
 * a change to what "static content" means.
 *
 * The cache starts empty and warms asynchronously (see
 * warmImportedGrammarCache) the first time anything grammar-related
 * reads it; until that resolves, merged reads simply behave as
 * "bundled only" (identical to pre-Phase-5 behavior) rather than
 * blocking or showing a loading state everywhere. useImportedGrammarReady
 * lets a component force one re-render once the cache actually warms.
 */
let cache: GrammarEntry[] = []
let warmPromise: Promise<void> | null = null

async function loadFromRepository(): Promise<void> {
  cache = await grammarImportRepository.getAll()
}

/** Idempotent — safe to call from every grammar read path; only the first call actually hits IndexedDB. */
export function warmImportedGrammarCache(): Promise<void> {
  if (!warmPromise) warmPromise = loadFromRepository()
  return warmPromise
}

/** Synchronous read of whatever's currently cached (possibly still empty if not yet warmed). */
export function getImportedGrammarSync(): GrammarEntry[] {
  return cache
}

/**
 * Re-reads the store and replaces the cache immediately — called right
 * after a successful import commit so the newly-imported entries are
 * visible without waiting for a future warm cycle, and by tests that
 * need to force a refresh.
 */
export async function refreshImportedGrammarCache(): Promise<void> {
  warmPromise = loadFromRepository()
  await warmPromise
}

/** Test-only: resets module state between test files. */
export function _resetImportedGrammarCacheForTests(): void {
  cache = []
  warmPromise = null
}
