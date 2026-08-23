import type { JLPTLevel } from '../../types/jlpt'
import './study.css'

/** "7 / 15" + a bar (spec section 11). `completed`/`total` come straight from the session — never fabricated. */
export function StudyProgress({
  level,
  completed,
  total,
}: {
  level: JLPTLevel
  completed: number
  total: number
}) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  return (
    <div className="study-progress">
      <h2>{level} Vocabulary</h2>
      <div className="study-progress__label">
        <span>
          {completed} / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div
        className="study-progress__track"
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${level} study session progress`}
      >
        <div className="study-progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
