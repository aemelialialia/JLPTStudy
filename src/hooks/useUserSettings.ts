import { useCallback, useEffect } from 'react'
import type { UserSettings } from '../types/settings'
import { settingsRepository } from '../data/repositories/settingsRepository'
import { useAsync } from './useAsync'

// Every `useUserSettings()` instance holds its own independent snapshot
// (via useAsync), fetched once on mount. Several components read settings
// at once (NavDrawer, Dashboard, ProfilePage, LevelSelectionPage, ...) and
// stay mounted across route changes, so without this a settings change
// made through one instance's `update()` would leave every other already-
// mounted instance showing stale data until it happened to remount. This
// tiny shared event channel is the fix: `update()` broadcasts, every
// instance listens and refreshes. No new state store — settingsRepository
// (IndexedDB) is still the single source of truth, this just tells every
// other reader "go re-read it."
const settingsChanged = new EventTarget()

/** Live user settings (target level, exam date, daily goal, ...) from IndexedDB. */
export function useUserSettings() {
  const { data, loading, error, refresh } = useAsync(() => settingsRepository.get(), [])

  useEffect(() => {
    const handleChange = () => refresh()
    settingsChanged.addEventListener('change', handleChange)
    return () => settingsChanged.removeEventListener('change', handleChange)
  }, [refresh])

  const update = useCallback(
    async (patch: Partial<UserSettings>) => {
      await settingsRepository.update(patch)
      refresh()
      settingsChanged.dispatchEvent(new Event('change'))
    },
    [refresh],
  )

  return { settings: data, loading, error, update, refresh }
}
