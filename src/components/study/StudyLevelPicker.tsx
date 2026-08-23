import { Link } from 'react-router-dom'
import { JLPT_LEVELS } from '../../types/jlpt'
import type { JLPTLevel } from '../../types/jlpt'
import { useLevelProgress } from '../../hooks/useLevelProgress'
import './study.css'

function StudyLevelRow({ level }: { level: JLPTLevel }) {
  const { data, loading } = useLevelProgress(level)
  const detail =
    loading || !data
      ? 'loading…'
      : data.total === 0
        ? 'no vocabulary imported'
        : `${data.memorized} / ${data.total} memorized`

  return (
    <li>
      <Link to={`/study/${level}`} className="study-level-row">
        <span className="study-level-row__label">{level}</span>
        <span className="study-level-row__detail">{detail}</span>
      </Link>
    </li>
  )
}

/** "Select a JLPT level" (spec section 2), the entry point at /study. */
export function StudyLevelPicker() {
  return (
    <div>
      <h1>Vocabulary Study</h1>
      <p>Choose a level to start today's flashcard session.</p>
      <ul className="study-level-list">
        {JLPT_LEVELS.map((level) => (
          <StudyLevelRow key={level} level={level} />
        ))}
      </ul>
    </div>
  )
}
