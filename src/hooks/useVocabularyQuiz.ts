import { useCallback, useEffect, useState } from 'react'
import type { JLPTLevel } from '../types/jlpt'
import { vocabularyQuizService, type VocabQuizQuestion } from '../services/vocabularyQuizService'

const QUESTION_COUNT = 10

export interface VocabQuizAnswer {
  vocabularyId: string
  selectedAnswer: string
  isCorrect: boolean
}

export type VocabQuizUIState =
  | { phase: 'loading' }
  | { phase: 'no-questions' }
  | { phase: 'ready'; count: number }
  | { phase: 'active'; index: number; question: VocabQuizQuestion }
  | { phase: 'feedback'; index: number; question: VocabQuizQuestion; selectedAnswer: string; isCorrect: boolean }
  | { phase: 'complete' }
  | { phase: 'error'; message: string }

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * Drives the vocabulary multiple-choice quiz (spec section 2). Unlike
 * useGrammarQuiz, this is deliberately in-memory only — no IndexedDB
 * session — since vocabulary quiz has no cross-navigation "preserve
 * context" requirement; leaving the page simply ends the attempt. Answers
 * still write real study state via vocabularyQuizService.submitAnswer.
 */
export function useVocabularyQuiz(level: JLPTLevel) {
  const [state, setState] = useState<VocabQuizUIState>({ phase: 'loading' })
  const [questions, setQuestions] = useState<VocabQuizQuestion[]>([])
  const [answers, setAnswers] = useState<VocabQuizAnswer[]>([])

  const load = useCallback(async () => {
    try {
      const built = await vocabularyQuizService.buildQuizSet(level, QUESTION_COUNT)
      setQuestions(built)
      setAnswers([])
      if (built.length === 0) {
        setState({ phase: 'no-questions' })
      } else {
        setState({ phase: 'ready', count: built.length })
      }
    } catch (err) {
      setState({ phase: 'error', message: errorMessage(err) })
    }
  }, [level])

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react/set-state-in-effect -- intentional: mirrors useGrammarQuiz's effect shape, synchronizing UI state with IndexedDB (an external system) rather than a derivable-during-render value.
    setState({ phase: 'loading' })
    load().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const start = useCallback(() => {
    if (questions.length === 0) return
    setState({ phase: 'active', index: 0, question: questions[0] })
  }, [questions])

  const answer = useCallback(
    async (selectedAnswer: string) => {
      if (state.phase !== 'active') return
      try {
        const { isCorrect } = await vocabularyQuizService.submitAnswer(state.question, selectedAnswer)
        setAnswers((prev) => [...prev, { vocabularyId: state.question.vocabularyId, selectedAnswer, isCorrect }])
        setState({ phase: 'feedback', index: state.index, question: state.question, selectedAnswer, isCorrect })
      } catch (err) {
        setState({ phase: 'error', message: errorMessage(err) })
      }
    },
    [state],
  )

  const continueToNext = useCallback(() => {
    if (state.phase !== 'feedback') return
    const nextIndex = state.index + 1
    if (nextIndex >= questions.length) {
      setState({ phase: 'complete' })
    } else {
      setState({ phase: 'active', index: nextIndex, question: questions[nextIndex] })
    }
  }, [state, questions])

  return { state, totalQuestions: questions.length, answers, start, answer, continueToNext, reload: load }
}
