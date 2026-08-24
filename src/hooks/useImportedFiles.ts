import { useCallback, useEffect, useState } from 'react'
import type { ImportedFileRecord } from '../types/importedFile'
import { importedFilesRepository } from '../data/repositories/importedFilesRepository'

/**
 * Backs Settings' "Uploaded Files" list. `data` is `null` while the first
 * read is in flight and `[]` once loaded with nothing imported yet, so
 * callers can tell "still loading" apart from "empty state" the same way
 * every other `use*` data hook in this app does.
 */
export function useImportedFiles() {
  const [data, setData] = useState<ImportedFileRecord[] | null>(null)

  const refresh = useCallback(() => {
    importedFilesRepository.getAll().then((records) => {
      // Most recently imported first.
      setData([...records].sort((a, b) => b.importedAt.localeCompare(a.importedAt)))
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, refresh }
}
