import type { JLPTLevel } from './jlpt'

export type ImportedFileKind = 'vocabulary' | 'grammar'

/**
 * One record per distinct (kind, level, fileName) XLSX import. Settings'
 * "Uploaded Files" list reads straight from this store rather than
 * tracking anything in component state, so it stays accurate across
 * reloads and reflects every level's imports, not just the most recent
 * one committed this session.
 */
export interface ImportedFileRecord {
  /**
   * Deterministic `${kind}-${level}-${fileName}`. Re-importing the exact
   * same file name for the same kind/level overwrites this record
   * (refreshing importedAt) rather than creating a second, meaningless
   * duplicate entry in the list — matching the app's existing
   * duplicate-handling behavior for the import content itself.
   */
  id: string
  kind: ImportedFileKind
  level: JLPTLevel
  fileName: string
  importedAt: string
}

export function importedFileId(kind: ImportedFileKind, level: JLPTLevel, fileName: string): string {
  return `${kind}-${level}-${fileName}`
}
