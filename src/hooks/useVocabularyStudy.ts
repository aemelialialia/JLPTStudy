import { useCallback, useEffect, useState } from 'react'
import type { JLPTLevel } from '../types/jlpt'
import type { StudySession } from '../types/studySession'
import { studySessionService, type StudyCard, type SessionSize, type LevelProgressSummary } from '../services/studySessionService'

export type StudyUIState =
  | { phase: 'loading' }
  | { phase: 'no-vocabulary' }
  | { phase: 'level-complete'; progress: LevelProgressSummary }
  | { phase: 'resume-prompt'; session: StudySession; progress: LevelProgressSummary }
  | { phase: 'setup'; progress: LevelProgressSummary }
  | { phase: 'active'; session: StudySession; card: StudyCard | null }
  | { phase: 'complete'; session: StudySession; progress: LevelProgressSummary }
  | { phase: 'error'; message: string }

/**
 * Drives the whole Phase 3 study flow (spec sections 2/5/17) as an
 * explicit state machine, the same pattern useVocabularyImport used in
 * Phase 2. Every phase transition goes through studySessionService —
 * this hook holds no vocabulary-selection, memorization, or persistence
 * logic itself, only "which screen are we on right now" — so the study
 * components underneath can be swapped for the Stitch design later
 * without touching any of this.
 *
 * Precedence when a level first loads (or is switched to):
 *   1. no vocabulary imported at all       -> 'no-vocabulary'
 *   2. an unfinished session exists        -> 'resume-prompt' (never silently discarded/restarted)
 *   3. every word already memorized        -> 'level-complete'
 *   4. otherwise                            -> 'setup' (pick a daily amount)
 */
/**
 * Pure lookup with no setState — figures out which phase a level should
 * be in right now, per the precedence documented above. Kept separate
 * from the hook so both the mount/level-change effect (which needs a
 * cancellation guard) and manual re-derives (backToSetup, after a review
 * cycle starts — plain event-handler code, no guard needed) share one
 * implementation instead of two copies of this precedence logic.
 */
async function deriveStudyState(level: JLPTLevel): Promise<StudyUIState> {
  const progress = await studySessionService.getLevelProgress(level)
  if (progress.total === 0) {
    return { phase: 'no-vocabulary' }
  }

  const active = await studySessionService.getCurrentStudySession(level)
  if (active) {
    return { phase: 'resume-prompt', session: active, progress }
  }

  if (progress.memorized === progress.total) {
    return { phase: 'level-complete', progress }
  }

  return { phase: 'setup', progress }
}

export function useVocabularyStudy(level: JLPTLevel) {
  const [state, setState] = useState<StudyUIState>({ phase: 'loading' })

  // Mirrors useAsync's shape deliberately: the setState calls live
  // directly in the effect body (not behind a called-back useCallback),
  // which is what keeps a level change's "loading" state synchronized to
  // an external system (IndexedDB) rather than looking like an avoidable
  // cascading render.
  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react/set-state-in-effect -- intentional: this synchronizes UI state with IndexedDB (an external system), not a derivable-during-render value; a "loading" phase must show immediately when `level` changes, before the async lookup below resolves.
    setState({ phase: 'loading' })
    deriveStudyState(level)
      .then((next) => {
        if (!cancelled) setState(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      cancelled = true
    }
  }, [level])

  /** Re-derives the current phase from scratch — used by "Back to level" on the summary screen, after starting a review cycle, and after an error. Safe to call from an event handler (not an effect), so no cancellation guard is needed here. */
  const load = useCallback(async () => {
    setState({ phase: 'loading' })
    try {
      setState(await deriveStudyState(level))
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }, [level])

  const enterActive = useCallback(async (session: StudySession) => {
    const card = await studySessionService.getCurrentCard(session)
    setState({ phase: 'active', session, card })
  }, [])

  const resume = useCallback(async () => {
    if (state.phase !== 'resume-prompt') return
    await enterActive(state.session)
  }, [state, enterActive])

  /**
   * Starts a session for `targetCount` words. Always goes through
   * studySessionService.startNewSession, which first abandons any
   * existing active session for this level (a harmless no-op when there
   * isn't one) — so this one action correctly covers both "pick an
   * amount from a clean setup screen" and "discard the unfinished
   * session and start over" (spec section 17's "Start New Session").
   */
  const beginSession = useCallback(
    async (targetCount: SessionSize) => {
      try {
        const session = await studySessionService.startNewSession(level, targetCount)
        await enterActive(session)
      } catch (err) {
        setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    },
    [level, enterActive],
  )

  const answer = useCallback(
    async (result: 'correct' | 'incorrect') => {
      if (state.phase !== 'active' || !state.card) return
      try {
        const updated = await studySessionService.submitAnswer(state.session, state.card.word.id, result)
        if (updated.status === 'completed') {
          const progress = await studySessionService.getLevelProgress(level)
          setState({ phase: 'complete', session: updated, progress })
        } else {
          await enterActive(updated)
        }
      } catch (err) {
        setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    },
    [state, level, enterActive],
  )

  const reviewIncorrect = useCallback(async () => {
    if (state.phase !== 'complete') return
    try {
      const session = await studySessionService.createReviewOfIncorrect(state.session)
      await enterActive(session)
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }, [state, enterActive])

  const beginReviewCycle = useCallback(async () => {
    if (state.phase !== 'level-complete') return
    await studySessionService.startReviewCycle(level)
    await load()
  }, [state, level, load])

  return {
    state,
    resume,
    beginSession,
    answer,
    reviewIncorrect,
    beginReviewCycle,
    backToSetup: load,
  }
}
