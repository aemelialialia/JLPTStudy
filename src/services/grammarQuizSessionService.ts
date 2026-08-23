import type { JLPTLevel } from '../types/jlpt'
import type { GrammarQuestion } from '../types/question'
import type { GrammarQuizSession } from '../types/grammarQuizSession'
import { createGrammarQuizSessionRecord, grammarQuizSessionStats } from '../types/grammarQuizSession'
import { getQuestionsForLevel, getQuestionById } from '../content/contentLoader'
import { grammarQuizSessionRepository } from '../data/repositories/grammarQuizSessionRepository'
import { grammarProgressRepository } from '../data/repositories/grammarProgressRepository'
import { quizService, type AnswerResult } from './quizService'
import { quizRepository } from '../data/repositories/quizRepository'
import { shuffled } from '../utils/shuffle'
import { todayISODate } from '../utils/date'

/** Exported so the "ready to start" screen can show the count before a session exists yet. */
export const DAILY_QUESTION_COUNT = 5

export type { AnswerResult }

/**
 * Persisted grammar quiz sessions — practice sessions and the Daily
 * Grammar Quiz alike (spec sections 7-13). Handles session
 * creation/resumption, answer submission (delegating attempt/mistake
 * recording to the existing quizService so there's exactly one place
 * that writes QuizAttempt/MistakeRecord history), and per-grammar-point
 * quiz-result tracking for the Profile.
 */
export const grammarQuizSessionService = {
  /**
   * Builds and persists a practice session: `count` questions from
   * `level` (all of them if `count` is omitted), shuffled. Any existing
   * active session for the level is abandoned first — starting a new
   * practice session is always an explicit, safe action.
   */
  async startPracticeSession(level: JLPTLevel, count?: number): Promise<GrammarQuizSession> {
    const existing = await grammarQuizSessionRepository.getActiveForLevel(level)
    if (existing) await grammarQuizSessionRepository.update({ ...existing, status: 'abandoned' })

    const all = shuffled(getQuestionsForLevel(level))
    const chosen = typeof count === 'number' ? all.slice(0, count) : all
    if (chosen.length === 0) throw new Error('No grammar questions available for this level yet.')

    const session = createGrammarQuizSessionRecord(
      level,
      chosen.map((q) => q.id),
    )
    await grammarQuizSessionRepository.create(session)
    return session
  },

  /**
   * Returns today's Daily Grammar Quiz session for a level, creating one
   * if it doesn't exist yet today. The question set favors grammar
   * points with unmastered mistakes (spec section 9: "previously missed
   * grammar, grammar points requiring review") before filling the rest
   * randomly — a simple heuristic, not full spaced repetition. Once
   * created, a day's session is stable: calling this again the same day
   * returns the SAME session (active or completed), so refreshing the
   * Dashboard never silently swaps out today's quiz.
   */
  async getOrCreateDailySession(level: JLPTLevel): Promise<GrammarQuizSession> {
    const today = todayISODate()
    const sessions = await grammarQuizSessionRepository.listByLevel(level)
    const existing = sessions.find((s) => s.isDaily && s.dailyForDate === today)
    if (existing) return existing

    // Only one session should ever be "active" per level at a time — if a
    // practice session is mid-way, starting today's daily quiz abandons
    // it first (same explicit-replacement rule startPracticeSession uses).
    const activeOther = sessions.find((s) => s.status === 'active')
    if (activeOther) await grammarQuizSessionRepository.update({ ...activeOther, status: 'abandoned' })

    const pool = getQuestionsForLevel(level)
    if (pool.length === 0) throw new Error('No grammar questions available for this level yet.')

    const mistakes = await quizRepository.getMistakesByLevel(level)
    const priorityPointIds = new Set(mistakes.filter((m) => !m.mastered).map((m) => m.grammarPointId))

    const priorityQuestions = shuffled(pool.filter((q) => priorityPointIds.has(q.grammarPointId)))
    // At most one question per grammar point in the priority pass, so a
    // single overdue point can't crowd out the rest of the daily quiz.
    const seenPoints = new Set<string>()
    const priorityPicked: GrammarQuestion[] = []
    for (const q of priorityQuestions) {
      if (seenPoints.has(q.grammarPointId)) continue
      seenPoints.add(q.grammarPointId)
      priorityPicked.push(q)
      if (priorityPicked.length >= DAILY_QUESTION_COUNT) break
    }

    const remainingSlots = DAILY_QUESTION_COUNT - priorityPicked.length
    const pickedIds = new Set(priorityPicked.map((q) => q.id))
    const fillers = remainingSlots > 0 ? shuffled(pool.filter((q) => !pickedIds.has(q.id))).slice(0, remainingSlots) : []

    const questions = [...priorityPicked, ...fillers]

    const session = createGrammarQuizSessionRecord(
      level,
      questions.map((q) => q.id),
      { isDaily: true, dailyForDate: today },
    )
    await grammarQuizSessionRepository.create(session)
    return session
  },

  async getActiveSession(level: JLPTLevel): Promise<GrammarQuizSession | undefined> {
    return grammarQuizSessionRepository.getActiveForLevel(level)
  },

  /**
   * Today's Daily Grammar Quiz session plus its first question, for the
   * Dashboard's Daily Grammar Quiz card (spec section 8: "prominently
   * display... e.g. 'N5 / 5 Questions / [Start Quiz]'"). Creates today's
   * session if it doesn't exist yet (same stable-per-day behavior as
   * getOrCreateDailySession) so the card always has something real to
   * preview rather than a placeholder.
   */
  async getDailyPreview(level: JLPTLevel): Promise<{ session: GrammarQuizSession; previewQuestion: GrammarQuestion | null }> {
    const session = await grammarQuizSessionService.getOrCreateDailySession(level)
    const previewQuestion = getQuestionById(session.questionIds[0]) ?? null
    return { session, previewQuestion }
  },

  getCurrentQuestion(session: GrammarQuizSession): GrammarQuestion | null {
    if (session.status !== 'active') return null
    const id = session.questionIds[session.currentIndex]
    if (!id) return null
    return getQuestionById(id) ?? null
  },

  /**
   * The recorded answer for whichever question `session.currentIndex`
   * currently points at, if any. This — not a separate piece of local
   * component state — is what lets the UI tell "unanswered question" and
   * "already answered, showing feedback" apart after a remount, which is
   * exactly what happens on the "View Grammar Point -> Return to Quiz"
   * round trip (spec sections 10-12): submitAnswer (below) deliberately
   * does NOT advance currentIndex, so the current question and its
   * answer are still right here when the quiz page remounts.
   */
  getAnswerForCurrentQuestion(session: GrammarQuizSession) {
    const id = session.questionIds[session.currentIndex]
    return session.answers.find((a) => a.questionId === id)
  },

  /**
   * Validates and records an answer for the CURRENT question without
   * advancing the session's position — the real QuizAttempt/
   * MistakeRecord history is written via quizService.submitAnswer (the
   * single source of truth for that data), and grammar-point quiz stats
   * are updated for the Profile. Call `advance` once the user is done
   * viewing feedback (and any grammar reference) to move to the next
   * question.
   */
  async submitAnswer(
    session: GrammarQuizSession,
    question: GrammarQuestion,
    selectedAnswer: string,
  ): Promise<{ session: GrammarQuizSession; result: AnswerResult }> {
    if (session.status !== 'active') throw new Error('This quiz session is not active.')
    const expectedId = session.questionIds[session.currentIndex]
    if (expectedId !== question.id) throw new Error('That is not the current question in this session.')
    if (grammarQuizSessionService.getAnswerForCurrentQuestion(session)) {
      throw new Error('This question has already been answered.')
    }

    const result = await quizService.submitAnswer(question, selectedAnswer)
    await grammarProgressRepository.recordQuizResult(question.grammarPointId, question.level, result.isCorrect)

    const updated: GrammarQuizSession = {
      ...session,
      answers: [
        ...session.answers,
        { questionId: question.id, selectedAnswer, isCorrect: result.isCorrect, answeredAt: new Date().toISOString() },
      ],
    }
    await grammarQuizSessionRepository.update(updated)
    return { session: updated, result }
  },

  /**
   * Moves past the current (already-answered) question to the next one,
   * or completes the session if that was the last question. Kept as a
   * separate step from submitAnswer specifically so the feedback screen
   * (with its "Review this grammar" reference) stays addressable by the
   * still-current session position until the user explicitly continues.
   */
  async advance(session: GrammarQuizSession): Promise<GrammarQuizSession> {
    if (session.status !== 'active') return session
    if (!grammarQuizSessionService.getAnswerForCurrentQuestion(session)) {
      throw new Error('Answer the current question before continuing.')
    }
    const nextIndex = session.currentIndex + 1
    const isComplete = nextIndex >= session.questionIds.length
    const updated: GrammarQuizSession = {
      ...session,
      currentIndex: nextIndex,
      status: isComplete ? 'completed' : 'active',
      completedAt: isComplete ? new Date().toISOString() : session.completedAt,
    }
    await grammarQuizSessionRepository.update(updated)
    return updated
  },

  stats: grammarQuizSessionStats,
}
