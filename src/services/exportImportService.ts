import { getDB } from '../data/db'
import type { VocabularyItem } from '../types/vocabulary'
import type { VocabularyStudyState } from '../types/studyState'
import type { QuizAttempt, MistakeRecord } from '../types/quiz'
import type { UserSettings, DailyStudyState } from '../types/settings'
import type { StudySession } from '../types/studySession'

/**
 * Schema for the exported JSON file. Versioned so a future release can
 * detect and migrate an older export instead of failing silently. This
 * is the whole mechanism for moving study data between an iPhone and an
 * iPad: export -> AirDrop/Files/email the JSON -> import on the other
 * device. No cloud service is involved at any point.
 */
export interface ExportPayload {
  schemaVersion: 1
  exportedAt: string
  vocabulary: VocabularyItem[]
  studyState: VocabularyStudyState[]
  quizAttempts: QuizAttempt[]
  mistakes: MistakeRecord[]
  settings: UserSettings | null
  dailyStudyState: DailyStudyState[]
  /**
   * Added in Phase 3. Optional on the *type* (not just the runtime check
   * below) so an export produced before this field existed still
   * type-checks as a valid payload wherever this interface is used, and
   * importPayload defaults a missing value to [] for the same reason —
   * an older backup file should still import cleanly, just without any
   * in-progress study session to resume.
   */
  studySessions?: StudySession[]
}

function isExportPayload(value: unknown): value is ExportPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    v.schemaVersion === 1 &&
    Array.isArray(v.vocabulary) &&
    Array.isArray(v.studyState) &&
    Array.isArray(v.quizAttempts) &&
    Array.isArray(v.mistakes)
  )
}

/**
 * Local data export/import/clear. This is the whole "backup" story for
 * a backend-less app: everything the user needs to move their study data
 * between devices, or reset it, is a plain JSON file they control.
 */
export const exportImportService = {
  /** Reads every store and assembles the full export payload (no browser APIs — easy to unit test). */
  async buildExportPayload(): Promise<ExportPayload> {
    const db = await getDB()
    const [vocabulary, studyState, quizAttempts, mistakes, settingsRow, dailyStudyState, studySessions] =
      await Promise.all([
        db.getAll('vocabulary'),
        db.getAll('studyState'),
        db.getAll('quizAttempts'),
        db.getAll('mistakes'),
        db.getAll('settings'),
        db.getAll('dailyStudyState'),
        db.getAll('studySessions'),
      ])

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      vocabulary,
      studyState,
      quizAttempts,
      mistakes,
      settings: settingsRow[0] ?? null,
      dailyStudyState,
      studySessions,
    }
  },

  /**
   * Writes an export payload into IndexedDB. This is an upsert-merge (by
   * primary key) rather than a destructive replace: importing on a device
   * that already has some local data won't wipe it, it just adds/updates
   * matching records. Call `clearAllData()` first for a full replace.
   */
  async importPayload(payload: unknown): Promise<void> {
    if (!isExportPayload(payload)) {
      throw new Error('This file is not a valid JLPT study data export.')
    }

    const db = await getDB()
    await Promise.all([
      Promise.all(payload.vocabulary.map((item) => db.put('vocabulary', item))),
      Promise.all(payload.studyState.map((item) => db.put('studyState', item))),
      Promise.all(payload.quizAttempts.map((item) => db.put('quizAttempts', item))),
      Promise.all(payload.mistakes.map((item) => db.put('mistakes', item))),
      Promise.all(payload.dailyStudyState.map((item) => db.put('dailyStudyState', item))),
      Promise.all((payload.studySessions ?? []).map((item) => db.put('studySessions', item))),
      payload.settings ? db.put('settings', { ...payload.settings, key: 'user-settings' }) : Promise.resolve(),
    ])
  },

  /**
   * Wipes all user-generated study data (imported vocabulary, progress,
   * quiz history, mistakes). App preferences in `settings` are left
   * alone — this clears *study data*, not the whole app configuration.
   */
  async clearAllData(): Promise<void> {
    const db = await getDB()
    await Promise.all([
      db.clear('vocabulary'),
      db.clear('studyState'),
      db.clear('quizAttempts'),
      db.clear('mistakes'),
      db.clear('dailyStudyState'),
      // Clearing vocabulary/studyState without also clearing sessions
      // would leave orphaned studySessions pointing at vocabulary ids
      // that no longer exist.
      db.clear('studySessions'),
    ])
  },

  /** Browser-only helper: triggers a JSON file download of the current export payload. */
  async downloadExport(filename = `jlpt-study-export-${new Date().toISOString().slice(0, 10)}.json`) {
    const payload = await exportImportService.buildExportPayload()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    try {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
    } finally {
      URL.revokeObjectURL(url)
    }
  },

  /** Browser-only helper: reads a File the user picked and imports it. */
  async importFromFile(file: File): Promise<void> {
    const text = await file.text()
    const payload = JSON.parse(text)
    await exportImportService.importPayload(payload)
  },
}
