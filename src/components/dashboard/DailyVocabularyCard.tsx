import { Link } from 'react-router-dom'
import type { JLPTLevel } from '../../types/jlpt'

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** "Daily Vocabulary Progress" ring card (spec section 6, Stitch dashboard screen). */
export function DailyVocabularyCard({ count, goal, level }: { count: number; goal: number; level: JLPTLevel }) {
  const fraction = goal > 0 ? Math.min(count / goal, 1) : 0
  const offset = CIRCUMFERENCE * (1 - fraction)

  return (
    <div className="dashboard-vocab-card pattern-asanoha spring-card">
      <h3 className="dashboard-vocab-card__title text-title-md">Daily Vocabulary Progress</h3>
      <div className="dashboard-vocab-card__ring">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="dashboard-vocab-card__ring-track" cx="50" cy="50" r={RADIUS} />
          <circle
            className="dashboard-vocab-card__ring-value"
            cx="50"
            cy="50"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="dashboard-vocab-card__ring-label">
          <span className="dashboard-vocab-card__ring-count text-headline-lg-mobile">{count}</span>
          <span className="dashboard-vocab-card__ring-goal text-label-sm">{`/ ${goal}`}</span>
        </div>
      </div>
      <Link to={`/study/${level}`} className="dashboard-vocab-card__cta squish-btn">
        Continue
        <span className="material-symbols-outlined">arrow_forward</span>
      </Link>
    </div>
  )
}
