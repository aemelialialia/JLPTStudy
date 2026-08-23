import type { JLPTLevel } from './jlpt'

/**
 * A daily vocabulary study session (Phase 3, spec section 5). This is
 * purely a "shopping list + pointer + answer log" for one round of
 * flashcards — it does NOT duplicate memorization state. Every answer
 * still updates the real `VocabularyStudyState` record immediately (via
 * studyStateRepository, see studySessionService.submitAnswer), so a
 * session can be abandoned or lost without corrupting study history; it
 * only controls what the user sees and in what order, and lets an
 * unfinished round be resumed after the page is closed/refreshed.
 */
export type StudySessionStatus = 'active' | 'completed' | 'abandoned'

export interface StudySessionAnswer {
  vocabularyId: string
  result: 'correct' | 'incorrect'
  answeredAt: string
}

export interface StudySession {
  id: string
  level: JLPTLevel
  /** The daily amount the user picked (10/15/20) — may exceed vocabularyIds.length if fewer eligible words existed. */
  targetCount: number
  /** Fixed at session creation; the presentation order for this session. Never mutated afterward. */
  vocabularyIds: string[]
  /** Index into vocabularyIds of the card currently being studied (or, once finished, equal to vocabularyIds.length). */
  currentIndex: number
  /** One entry per answered card, in answer order. A card only counts as "completed" once it has an entry here. */
  answers: StudySessionAnswer[]
  startedAt: string
  completedAt: string | null
  status: StudySessionStatus
}

/** Factory for a freshly-created session. */
export function createStudySessionRecord(
  level: JLPTLevel,
  targetCount: number,
  vocabularyIds: string[],
): StudySession {
  return {
    id: crypto.randomUUID(),
    level,
    targetCount,
    vocabularyIds,
    currentIndex: 0,
    answers: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'active',
  }
}

/** Vocabulary ids already answered this session — spec section 5's "Completed vocabulary IDs", derived rather than stored separately so it can never drift out of sync with `answers`. */
export function completedVocabularyIds(session: StudySession): string[] {
  return session.answers.map((a) => a.vocabularyId)
}

/** Studied/correct/incorrect counts for the session-complete summary screen (spec section 12) — computed, never fabricated. */
export function sessionStats(session: StudySession): { studied: number; correct: number; incorrect: number } {
  const studied = session.answers.length
  const correct = session.answers.filter((a) => a.result === 'correct').length
  return { studied, correct, incorrect: studied - correct }
}

/** Ids answered incorrectly at least once this session, in first-seen order, deduplicated — feeds "Review Incorrect Words". */
export function incorrectVocabularyIds(session: StudySession): string[] {
  const seen = new Set<string>()
  const ids: string[] = []
  for (const answer of session.answers) {
    if (answer.result === 'incorrect' && !seen.has(answer.vocabularyId)) {
      seen.add(answer.vocabularyId)
      ids.push(answer.vocabularyId)
    }
  }
  return ids
}
