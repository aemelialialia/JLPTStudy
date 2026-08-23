import { Link } from 'react-router-dom'
import type { LevelProgressSummary } from '../../services/studySessionService'
import type { SessionSize } from '../../services/studySessionService'
import { StatCard } from '../common/StatCard'
import { DailyAmountSelector } from './DailyAmountSelector'
import '../vocabulary/vocabulary.css'
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
    <div>
      <h2>{progress.level} Vocabulary</h2>
      <div className="study-stat-grid">
        <StatCard label="Total" value={progress.total} />
        <StatCard label="Memorized" value={progress.memorized} />
        <StatCard label="Learning" value={progress.learning} />
        <StatCard label="New" value={progress.new} />
      </div>

      <DailyAmountSelector onSelect={onSelectAmount} />

      <Link to={`/level/${progress.level}`} className="vocab-button">
        Back to Vocabulary Management
      </Link>
    </div>
  )
}
