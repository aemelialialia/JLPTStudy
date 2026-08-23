import type { JLPTLevel } from '../types/jlpt'
import type { VocabularyItem } from '../types/vocabulary'
import type { VocabularyStudyState } from '../types/studyState'
import type { StudySession } from '../types/studySession'
import { createStudySessionRecord, incorrectVocabularyIds } from '../types/studySession'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { studyStateRepository } from '../data/repositories/studyStateRepository'
import { studySessionRepository } from '../data/repositories/studySessionRepository'
import { vocabularyLearningService, type SessionSize, type LevelProgressSummary } from './vocabularyLearningService'

export type { SessionSize, LevelProgressSummary }

export interface StudyCard {
  word: VocabularyItem
  studyState: VocabularyStudyState
}

/**
 * The Phase 3 flashcard/study engine (spec section 21's "Study Session
 * Service"). This is the ONLY place that decides which vocabulary a
 * session studies, how a session advances, and how an answer changes
 * memorization status — the UI (useVocabularyStudy + the study
 * components) only ever calls into this, exactly like the diagram in
 * spec section 18/21:
 *
 *   StudySession UI -> studySessionService -> vocabularyRepository/
 *   studyStateRepository/studySessionRepository -> IndexedDB
 *
 * Every operation is level-agnostic (level is just a parameter), so the
 * same engine drives N5/N4/N3/N2 without any per-level code (spec 18).
 */
export const studySessionService = {
  /**
   * Creates a new session: selects up to `targetCount` eligible words
   * (status != memorized) for `level` via vocabularyRepository's
   * rotation-aware selection, and persists the session. If fewer eligible
   * words exist than requested, the session simply studies all of them —
   * never duplicates a word to pad it out (spec section 3).
   *
   * Throws if there is nothing eligible to study (callers — the
   * useVocabularyStudy hook — check level progress first and never call
   * this when the level is empty or fully memorized, but this guard keeps
   * the service correct even if called directly).
   */
  async createStudySession(level: JLPTLevel, targetCount: SessionSize): Promise<StudySession> {
    const candidates = await vocabularyRepository.getRandomCandidates(level, targetCount, {
      excludeMemorized: true,
    })
    if (candidates.length === 0) {
      throw new Error('No eligible vocabulary to study for this level right now.')
    }
    const session = createStudySessionRecord(
      level,
      targetCount,
      candidates.map((word) => word.id),
    )
    await studySessionRepository.create(session)
    return session
  },

  /**
   * Starts a fresh session for a level, first abandoning any existing
   * unfinished session for that level (spec section 17's "Start New
   * Session" action). The abandoned session's answers already updated
   * real study-state records as they happened, so nothing about a user's
   * progress is lost by abandoning it — only its own resumability.
   */
  async startNewSession(level: JLPTLevel, targetCount: SessionSize): Promise<StudySession> {
    const existing = await studySessionRepository.getActiveForLevel(level)
    if (existing) {
      await studySessionRepository.update({ ...existing, status: 'abandoned' })
    }
    return studySessionService.createStudySession(level, targetCount)
  },

  /** The unfinished (status 'active') session for a level, or undefined if none — drives the resume prompt (spec section 17). */
  async getCurrentStudySession(level: JLPTLevel): Promise<StudySession | undefined> {
    return studySessionRepository.getActiveForLevel(level)
  },

  /**
   * The word (plus its live study state) the user should see right now
   * for an active session, or null once every card has been answered.
   * Reads the word fresh from vocabularyRepository each time (rather than
   * caching it on the session) so edits made elsewhere are reflected.
   */
  async getCurrentCard(session: StudySession): Promise<StudyCard | null> {
    if (session.status !== 'active') return null
    const vocabularyId = session.vocabularyIds[session.currentIndex]
    if (!vocabularyId) return null
    const word = await vocabularyRepository.getById(vocabularyId)
    // Defensive: the word could have been deleted from vocabulary
    // management mid-session in another tab. Skip past it rather than
    // showing a broken card — the caller re-reads currentIndex/getCurrentCard afterward.
    if (!word) {
      const skipped: StudySession = { ...session, currentIndex: session.currentIndex + 1 }
      await studySessionRepository.update(skipped)
      return studySessionService.getCurrentCard(skipped)
    }
    const studyState = await studyStateRepository.getOrCreate(vocabularyId)
    return { word, studyState }
  },

  /**
   * Records the answer for the card currently at `session.currentIndex`
   * and advances the session by one. The actual memorization-status
   * update (spec sections 8/9/10) happens in studyStateRepository —
   * immediately, not staged on the session — so an abandoned or
   * never-completed session never loses recorded progress.
   *
   * `vocabularyId` must match the session's current card; this is a
   * cheap integrity check against a stale UI answering the wrong card
   * (e.g. after a resume race), not a feature the UI needs to think about.
   */
  async submitAnswer(
    session: StudySession,
    vocabularyId: string,
    result: 'correct' | 'incorrect',
  ): Promise<StudySession> {
    if (session.status !== 'active') {
      throw new Error('This study session is not active.')
    }
    const expectedId = session.vocabularyIds[session.currentIndex]
    if (expectedId !== vocabularyId) {
      throw new Error('That is not the current card in this session.')
    }

    if (result === 'correct') {
      await studyStateRepository.recordCorrect(vocabularyId)
    } else {
      await studyStateRepository.recordIncorrect(vocabularyId)
    }

    const nextIndex = session.currentIndex + 1
    const isComplete = nextIndex >= session.vocabularyIds.length
    const updated: StudySession = {
      ...session,
      currentIndex: nextIndex,
      answers: [...session.answers, { vocabularyId, result, answeredAt: new Date().toISOString() }],
      status: isComplete ? 'completed' : 'active',
      completedAt: isComplete ? new Date().toISOString() : null,
    }
    await studySessionRepository.update(updated)
    return updated
  },

  /**
   * Explicitly finalizes a session (defensive completion path — normally
   * submitAnswer already marks a session 'completed' once its last card
   * is answered, but this is exposed for a future "end session early"
   * action without embedding that decision in the UI).
   */
  async completeStudySession(session: StudySession): Promise<StudySession> {
    if (session.status === 'completed') return session
    const updated: StudySession = { ...session, status: 'completed', completedAt: new Date().toISOString() }
    await studySessionRepository.update(updated)
    return updated
  },

  /**
   * "Review Incorrect Words" (spec section 12): starts a new session
   * containing exactly the words missed in `session`, reusing the same
   * vocabulary records rather than creating duplicates. Unlike
   * createStudySession, this doesn't run the eligibility/rotation
   * selection — the word list is exactly what the caller got wrong.
   */
  async createReviewOfIncorrect(session: StudySession): Promise<StudySession> {
    const ids = incorrectVocabularyIds(session)
    if (ids.length === 0) {
      throw new Error('No incorrect words to review from that session.')
    }
    const existing = await studySessionRepository.getActiveForLevel(session.level)
    if (existing) {
      await studySessionRepository.update({ ...existing, status: 'abandoned' })
    }
    const reviewSession = createStudySessionRecord(session.level, ids.length, ids)
    await studySessionRepository.create(reviewSession)
    return reviewSession
  },

  /** Delegated to vocabularyLearningService so progress logic has exactly one implementation. */
  async getLevelProgress(level: JLPTLevel): Promise<LevelProgressSummary> {
    return vocabularyLearningService.getLevelProgress(level)
  },

  /** True once every imported word in a level is memorized (spec section 15's completion detection). */
  async isLevelComplete(level: JLPTLevel): Promise<boolean> {
    return vocabularyLearningService.isLevelFullyMemorized(level)
  },

  /**
   * Starts a review cycle (spec section 16): delegates the actual
   * memorized -> learning reset to vocabularyLearningService, which
   * preserves all historical counters/timestamps and only changes status.
   */
  async startReviewCycle(level: JLPTLevel): Promise<void> {
    await vocabularyLearningService.startReviewCycle(level)
  },
}
