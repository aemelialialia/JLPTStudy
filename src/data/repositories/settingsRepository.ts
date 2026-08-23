import { getDB } from '../db'
import type { UserSettings, DailyStudyState } from '../../types/settings'
import { DEFAULT_SETTINGS } from '../../types/settings'

const SETTINGS_KEY = 'user-settings'

/**
 * Settings are stored as a single row keyed by a constant string, since
 * this is a single-user app with one settings object — no need for a
 * more elaborate key/value store.
 */
export const settingsRepository = {
  async get(): Promise<UserSettings> {
    const db = await getDB()
    const row = await db.get('settings', SETTINGS_KEY)
    if (!row) return DEFAULT_SETTINGS
    // UserSettings has a free-form index signature, so the row's extra
    // `key` field (the IndexedDB keyPath) is harmless to hand back as-is.
    return row
  },

  async update(patch: Partial<UserSettings>): Promise<UserSettings> {
    const current = await settingsRepository.get()
    const next = { ...current, ...patch }
    const db = await getDB()
    await db.put('settings', { ...next, key: SETTINGS_KEY })
    return next
  },

  async reset(): Promise<void> {
    const db = await getDB()
    await db.delete('settings', SETTINGS_KEY)
  },

  async getDailyState(date: string): Promise<DailyStudyState> {
    const db = await getDB()
    const existing = await db.get('dailyStudyState', date)
    return existing ?? { date, vocabularyReviewedCount: 0, quizQuestionsAnsweredCount: 0 }
  },

  async saveDailyState(state: DailyStudyState): Promise<void> {
    const db = await getDB()
    await db.put('dailyStudyState', state)
  },
}
