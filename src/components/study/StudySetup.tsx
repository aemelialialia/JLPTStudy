import { Link } from 'react-router-dom'
import type { LevelProgressSummary } from '../../services/studySessionService'
import type { SessionSize } from '../../services/studySessionService'
import { StatCard } from '../common/StatCard'
import { DailyAmountSelector } from './DailyAmountSelector'
import './study.css'

/**
 * The study setup screen (spec section 2/3): real progress numbers from
 * IndexedDB (never hard-coded), then "how many words today?". A link
 * back to vocabulary management is always available, per spec section 2's
 * explicit requirement.
 */
export function StudySetup({
  progress,
  onSelectAmount,
}: {
  progress: LevelProgressSummary
  onSelectAmount: (count: SessionSize) => void
}) {
  return (
    <div className="study-setup">
      <h2 className="text-headline-lg">{progress.level} Vocabulary</h2>
      <div className="study-stat-grid">
        <StatCard label="Total" value={progress.total} />
        <StatCard label="Memorized" value={progress.memorized} />
        <StatCard label="Learning" value={progress.learning} />
        <StatCard label="New" value={progress.new} />
      </div>

      <DailyAmountSelector onSelect={onSelectAmount} />

      <Link to={`/study/${progress.level}/quiz`} className="study-quiz-entry squish-btn">
        <span className="study-quiz-entry__left">
          <span className="study-quiz-entry__icon">
            <span className="material-symbols-outlined">quiz</span>
          </span>
          <span>
            <h4 className="study-quiz-entry__title text-title-md">Vocabulary Quiz</h4>
            <p className="study-quiz-entry__desc">Test your recent learnings.</p>
          </span>
        </span>
        <span className="study-quiz-entry__arrow">
          <span className="material-symbols-outlined">arrow_forward</span>
        </span>
      </Link>

      <Link to={`/level/${progress.level}`} className="study-btn">
        Back to Vocabulary Management
      </Link>
    </div>
  )
}
