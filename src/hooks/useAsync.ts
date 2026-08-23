import { useEffect, useState, useCallback } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  /** Re-runs the async function, e.g. after a mutation elsewhere invalidates this data. */
  refresh: () => void
}

/**
 * Small generic hook that runs an async function and exposes
 * {data, loading, error, refresh}. This is the one piece of "wiring"
 * glue between React and the repository/service layer — components
 * call domain hooks built on this (see useLevelProgress.ts) rather than
 * ever importing a repository or calling IndexedDB directly.
 *
 * Deps mirror useEffect's dependency array: the async function re-runs
 * when any dependency changes.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fn()
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  return { data, loading, error, refresh }
}
