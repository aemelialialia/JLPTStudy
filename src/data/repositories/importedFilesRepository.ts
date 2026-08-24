import { getDB } from '../db'
import type { ImportedFileKind, ImportedFileRecord } from '../../types/importedFile'
import { importedFileId } from '../../types/importedFile'
import type { JLPTLevel } from '../../types/jlpt'

/**
 * Tracks every vocabulary/grammar XLSX successfully imported, for
 * Settings' "Uploaded Files" list. Written to by xlsxImportService and
 * grammarXlsxImportService right after a commit succeeds — this
 * repository itself has no import logic, it just records the fact that a
 * given file was imported.
 */
export const importedFilesRepository = {
  async recordImport(kind: ImportedFileKind, level: JLPTLevel, fileName: string): Promise<void> {
    const db = await getDB()
    const record: ImportedFileRecord = {
      id: importedFileId(kind, level, fileName),
      kind,
      level,
      fileName,
      importedAt: new Date().toISOString(),
    }
    // put(), not add(): re-importing the same file name for the same
    // kind/level resolves to the same id, so this refreshes importedAt
    // in place instead of creating a second, meaningless duplicate entry.
    await db.put('importedFiles', record)
  },

  async getAll(): Promise<ImportedFileRecord[]> {
    const db = await getDB()
    return db.getAll('importedFiles')
  },
}
