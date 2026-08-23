import { Link } from 'react-router-dom'
import type { GrammarQuizSession } from '../../types/grammarQuizSession'
import { grammarQuizSessionStats } from '../../types/grammarQuizSession'

/** Completion screen once every question in the session has been answered. */
export function GrammarQuizSummary({ session, level }: { session: GrammarQuizSession; level: string }) {
  const stats = grammarQuizSessionStats(session)
  const total = session.questionIds.length
  const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0
  return (
    <div className="grammar-quiz__summary">
      <span className="material-symbols-outlined" data-fill="1" style={{ fontSize: 48, color: 'var(--color-primary)' }}>
        emoji_events
      </span>
      <h1 className="text-headline-lg">Quiz complete!</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        {session.isDaily ? "Today's Daily Grammar Quiz" : `${level} practice`} — {stats.correct} / {total} correct
      </p>
      <div className="grammar-quiz__summary-stats">
        <span className="text-title-md" style={{ color: 'var(--color-primary)' }}>{`${accuracy}%`}</span>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to={`/grammar/${level}`} className="grammar-quiz__continue squish-btn">
          Back to Grammar
        </Link>
      </div>
    </div>
  )
}
