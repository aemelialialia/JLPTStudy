import { Link } from 'react-router-dom'
import type { JLPTLevel } from '../../types/jlpt'
import './study.css'

/** Shown instead of the daily-amount picker once every word in a level is memorized (spec section 15). */
export function LevelCompleteBanner({
  level,
  onStartReviewCycle,
}: {
  level: JLPTLevel
  onStartReviewCycle: () => void
}) {
  return (
    <div className="study-banner study-banner--celebration">
      <h2>🎉 {level} Complete!</h2>
      <p style={{ margin: 0 }}>You&apos;ve marked all {level} vocabulary as memorized.</p>
      <div className="study-btn-row">
        <button type="button" className="study-btn study-btn--primary squish-btn" onClick={onStartReviewCycle}>
          Start Review Cycle
        </button>
        {/* A fully-memorized level otherwise has no way back to vocabulary
            management (browsing the list, re-importing) without first
            starting a review cycle — this keeps that path open. */}
        <Link to={`/level/${level}`} className="study-btn squish-btn">
          Manage Vocabulary
        </Link>
      </div>
    </div>
  )
}
