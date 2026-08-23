/**
 * User study settings and misc app preferences. Stored in IndexedDB as a
 * single-row key/value-ish record so it can grow without schema
 * migrations for every new preference.
 */
export interface UserSettings {
  /** Default number of words offered per vocabulary study session. */
  defaultSessionSize: 10 | 15 | 20
  /** Last JLPT level the user was studying, used to resume where they left off. */
  lastActiveLevel: string | null
  /** Free-form bag for future preferences (theme choice, etc.) without a migration. */
  [key: string]: unknown
}

export const DEFAULT_SETTINGS: UserSettings = {
  defaultSessionSize: 10,
  lastActiveLevel: null,
}

/**
 * Ephemeral "what have I studied today" state. Deliberately minimal in
 * this foundation step — just enough shape to persist across a session
 * without committing to specific streak/gamification rules yet.
 */
export interface DailyStudyState {
  /** ISO date (YYYY-MM-DD), also the IndexedDB key. */
  date: string
  vocabularyReviewedCount: number
  quizQuestionsAnsweredCount: number
}
