import type { StudySession } from '../../types/studySession'
import type { LevelProgressSummary } from '../../services/studySessionService'
import { sessionStats, incorrectVocabularyIds } from '../../types/studySession'
import { StatCard } from '../common/StatCard'
import '../vocabulary/vocabulary.css'
import './study.css'

/**
 * End-of-session screen (spec section 12). Every number here is computed
 * from the actual completed session and the freshly-reloaded level
 * progress — never a placeholder/fabricated value.
 */
export function SessionSummary({
  session,
  progress,
  onReviewIncorrect,
  onBackToLevel,
}: {
  session: StudySession
  progress: LevelProgressSummary
  onReviewIncorrect: () => void
  onBackToLevel: () => void
}) {
  const stats = sessionStats(session)
  const hasIncorrect = incorrectVocabularyIds(session).length > 0

  return (
    <div className="study-banner">
      <h2>Study Session Complete!</h2>
      <p>
        {stats.studied} word{stats.studied === 1 ? '' : 's'} studied
      </p>

      <div className="study-summary-stat-grid">
        <StatCard label="Correct" value={stats.correct} />
        <StatCard label="Incorrect" value={stats.incorrect} />
      </div>

      <h3>{session.level} Progress</h3>
      <p>
        Memorized: {progress.memorized} / {progress.total}
      </p>

      <div className="vocab-button-row" style={{ justifyContent: 'center' }}>
        {hasIncorrect && (
          <button type="button" className="vocab-button" onClick={onReviewIncorrect}>
            Review Incorrect Words
          </button>
        )}
        <button type="button" className="vocab-button vocab-button--primary" onClick={onBackToLevel}>
          Back to {session.level}
        </button>
      </div>
    </div>
  )
}
