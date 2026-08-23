import type { StudySession } from '../../types/studySession'
import type { LevelProgressSummary } from '../../services/studySessionService'
import { sessionStats, incorrectVocabularyIds } from '../../types/studySession'
import { StatCard } from '../common/StatCard'
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
      <span className="material-symbols-outlined" data-fill="1" style={{ fontSize: 40, color: 'var(--color-primary)' }}>
        emoji_events
      </span>
      <h2>Study Session Complete!</h2>
      <p style={{ margin: 0 }}>
        {stats.studied} word{stats.studied === 1 ? '' : 's'} studied
      </p>

      <div className="study-summary-stat-grid">
        <StatCard label="Correct" value={stats.correct} />
        <StatCard label="Incorrect" value={stats.incorrect} />
      </div>

      <div>
        <h3 style={{ margin: '0 0 var(--space-1)' }}>{session.level} Progress</h3>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          Memorized: {progress.memorized} / {progress.total}
        </p>
      </div>

      <div className="study-btn-row">
        {hasIncorrect && (
          <button type="button" className="study-btn squish-btn" onClick={onReviewIncorrect}>
            Review Incorrect Words
          </button>
        )}
        <button type="button" className="study-btn study-btn--primary squish-btn" onClick={onBackToLevel}>
          Back to {session.level}
        </button>
      </div>
    </div>
  )
}
