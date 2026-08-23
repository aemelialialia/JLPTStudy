import type { JLPTLevel } from '../../types/jlpt'
import './study.css'

/**
 * The study screen header (spec section 11), matching the Stitch
 * `vocabulary_study` screen: a level pill, "Daily Review", and how many
 * cards remain — plus a visually-hidden but screen-reader-visible
 * progress bar so the numeric progress (never fabricated, straight from
 * the session) stays accessible without a visible bar cluttering the
 * simpler Stitch header.
 */
export function StudyProgress({
  level,
  completed,
  total,
}: {
  level: JLPTLevel
  completed: number
  total: number
}) {
  const remaining = Math.max(total - completed, 0)
  return (
    <div className="study-progress">
      <span className="study-progress__badge text-label-sm">{`JLPT ${level}`}</span>
      <h2 className="text-title-md">Daily Review</h2>
      <p className="study-progress__remaining">
        {remaining} card{remaining === 1 ? '' : 's'} remaining
      </p>
      <div
        className="study-progress__bar"
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${level} study session progress`}
      >
        {completed} / {total}
      </div>
    </div>
  )
}
