import { useCallback } from 'react'
import type { UserSettings } from '../types/settings'
import { settingsRepository } from '../data/repositories/settingsRepository'
import { useAsync } from './useAsync'

/** Live user settings (target level, exam date, daily goal, ...) from IndexedDB. */
export function useUserSettings() {
  const { data, loading, error, refresh } = useAsync(() => settingsRepository.get(), [])

  const update = useCallback(
    async (patch: Partial<UserSettings>) => {
      await settingsRepository.update(patch)
      refresh()
    },
    [refresh],
  )

  return { settings: data, loading, error, update, refresh }
}
