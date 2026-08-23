import { useCallback, useEffect, useState } from 'react'
import type { JLPTLevel } from '../types/jlpt'
import type { GrammarQuestion } from '../types/question'
import type { GrammarQuizSession } from '../types/grammarQuizSession'
import { getQuestionsForLevel } from '../content/contentLoader'
import { grammarQuizSessionService, type AnswerResult } from '../services/grammarQuizSessionService'

export type GrammarQuizMode = 'daily' | 'practice'

export type GrammarQuizUIState =
  | { phase: 'loading' }
  | { phase: 'no-questions' }
  | { phase: 'ready' }
  | { phase: 'active'; session: GrammarQuizSession; question: GrammarQuestion }
  | { phase: 'feedback'; session: GrammarQuizSession; question: GrammarQuestion; result: AnswerResult; selectedAnswer: string }
  | { phase: 'complete'; session: GrammarQuizSession }
  | { phase: 'error'; message: string }

/** Exported so the "ready to start" screen can show the count before a session exists yet. */
export const PRACTICE_DEFAULT_COUNT = 10

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Derives the UI phase for an existing (possibly mid-answer) session, or 'ready' if none. */
function deriveFromSession(session: GrammarQuizSession | undefined): GrammarQuizUIState {
  if (!session) return { phase: 'ready' }
  if (session.status === 'completed') return { phase: 'complete', session }
  const question = grammarQuizSessionService.getCurrentQuestion(session)
  if (!question) return { phase: 'complete', session }
  const existingAnswer = grammarQuizSessionService.getAnswerForCurrentQuestion(session)
  if (existingAnswer) {
    return {
      phase: 'feedback',
      session,
      question,
      selectedAnswer: existingAnswer.selectedAnswer,
      result: {
        isCorrect: existingAnswer.isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        grammarPointId: question.grammarPointId,
      },
    }
  }
  return { phase: 'active', session, question }
}

/**
 * Drives the grammar quiz flow (practice or Daily Grammar Quiz) as an
 * explicit state machine, the same pattern useVocabularyStudy uses for
 * flashcards. Session persistence (src/services/grammarQuizSessionService)
 * is what makes "View Grammar Point -> Return to Quiz" (spec sections
 * 10-12) work for free: remounting this hook after that round trip just
 * re-derives from the still-persisted, still-unadvanced session.
 */
export function useGrammarQuiz(level: JLPTLevel, mode: GrammarQuizMode) {
  const [state, setState] = useState<GrammarQuizUIState>({ phase: 'loading' })

  const load = useCallback(async () => {
    if (getQuestionsForLevel(level).length === 0) {
      setState({ phase: 'no-questions' })
      return
    }
    try {
      const active = await grammarQuizSessionService.getActiveSession(level)
      if (active && active.isDaily === (mode === 'daily')) {
        setState(deriveFromSession(active))
      } else {
        setState({ phase: 'ready' })
      }
    } catch (err) {
      setState({ phase: 'error', message: errorMessage(err) })
    }
  }, [level, mode])

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react/set-state-in-effect -- intentional: mirrors useVocabularyStudy's effect shape, synchronizing UI state with IndexedDB (an external system) rather than a derivable-during-render value.
    setState({ phase: 'loading' })
    load().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const start = useCallback(async () => {
    try {
      const session =
        mode === 'daily'
          ? await grammarQuizSessionService.getOrCreateDailySession(level)
          : await grammarQuizSessionService.startPracticeSession(level, PRACTICE_DEFAULT_COUNT)
      setState(deriveFromSession(session))
    } catch (err) {
      setState({ phase: 'error', message: errorMessage(err) })
    }
  }, [level, mode])

  const answer = useCallback(
    async (selectedAnswer: string) => {
      if (state.phase !== 'active') return
      try {
        const { session, result } = await grammarQuizSessionService.submitAnswer(state.session, state.question, selectedAnswer)
        setState({ phase: 'feedback', session, question: state.question, result, selectedAnswer })
      } catch (err) {
        setState({ phase: 'error', message: errorMessage(err) })
      }
    },
    [state],
  )

  const continueToNext = useCallback(async () => {
    if (state.phase !== 'feedback') return
    try {
      const session = await grammarQuizSessionService.advance(state.session)
      setState(deriveFromSession(session))
    } catch (err) {
      setState({ phase: 'error', message: errorMessage(err) })
    }
  }, [state])

  return { state, start, answer, continueToNext, reload: load }
}
