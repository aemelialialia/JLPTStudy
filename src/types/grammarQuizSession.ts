import type { JLPTLevel } from './jlpt'

export type GrammarQuizSessionStatus = 'active' | 'completed' | 'abandoned'

export interface GrammarQuizAnswer {
  questionId: string
  selectedAnswer: string
  isCorrect: boolean
  answeredAt: string
}

/**
 * A persisted grammar quiz session — the same "shopping list + pointer"
 * design as vocabulary's StudySession (src/types/studySession.ts), and
 * for the same reason: this is what lets a user leave a quiz mid-way
 * (to look something up, switch apps, refresh) and come straight back
 * to the exact question and prior answers, per spec sections 9 and 11
 * ("Preserve Quiz Context" / never reset the whole quiz to view a
 * grammar reference). Real quiz-attempt/mistake history is still
 * recorded immediately via quizService/quizRepository on every answer —
 * this record only tracks *this session's* shape and progress.
 */
export interface GrammarQuizSession {
  id: string
  level: JLPTLevel
  questionIds: string[]
  currentIndex: number
  answers: GrammarQuizAnswer[]
  startedAt: string
  completedAt: string | null
  status: GrammarQuizSessionStatus
  /** True for the curated/random "Daily Grammar Quiz" (spec section 9), so the Dashboard can distinguish it from ad-hoc practice sessions. */
  isDaily: boolean
  /** ISO date (YYYY-MM-DD) this session counts as "today's" daily quiz for, when isDaily is true — lets the Dashboard know today's daily quiz is already done/in-progress without a separate lookup table. */
  dailyForDate: string | null
}

export function createGrammarQuizSessionRecord(
  level: JLPTLevel,
  questionIds: string[],
  options: { isDaily?: boolean; dailyForDate?: string } = {},
): GrammarQuizSession {
  return {
    id: crypto.randomUUID(),
    level,
    questionIds,
    currentIndex: 0,
    answers: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'active',
    isDaily: options.isDaily ?? false,
    dailyForDate: options.dailyForDate ?? null,
  }
}

export function grammarQuizSessionStats(session: GrammarQuizSession): { answered: number; correct: number; incorrect: number } {
  const correct = session.answers.filter((a) => a.isCorrect).length
  return { answered: session.answers.length, correct, incorrect: session.answers.length - correct }
}
