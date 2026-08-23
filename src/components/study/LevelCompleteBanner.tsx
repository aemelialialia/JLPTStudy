import type { JLPTLevel } from '../../types/jlpt'
import '../vocabulary/vocabulary.css'
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
      <p>You&apos;ve marked all {level} vocabulary as memorized.</p>
      <button type="button" className="vocab-button vocab-button--primary" onClick={onStartReviewCycle}>
        Start Review Cycle
      </button>
    </div>
  )
}
