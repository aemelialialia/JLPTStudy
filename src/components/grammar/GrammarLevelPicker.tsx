import { Link } from 'react-router-dom'
import { JLPT_LEVELS } from '../../types/jlpt'
import type { JLPTLevel } from '../../types/jlpt'
import { useGrammarLevelProgress } from '../../hooks/useGrammarLevelProgress'
import '../study/study.css'

function GrammarLevelRow({ level }: { level: JLPTLevel }) {
  const { data, loading } = useGrammarLevelProgress(level)
  const detail =
    loading || !data
      ? 'loading…'
      : data.total === 0
        ? 'no grammar points yet'
        : `${data.studied} / ${data.total} studied`

  return (
    <li>
      <Link to={`/grammar/${level}`} className="study-level-row">
        <span className="study-level-row__label">{level}</span>
        <span className="study-level-row__detail">{detail}</span>
      </Link>
    </li>
  )
}

/** /grammar — the level-selection entry point for the grammar system, mirroring StudyLevelPicker. */
export function GrammarLevelPicker() {
  return (
    <div>
      <h1>Grammar</h1>
      <p>Choose a level to browse grammar points, lessons, and quizzes.</p>
      <ul className="study-level-list">
        {JLPT_LEVELS.map((level) => (
          <GrammarLevelRow key={level} level={level} />
        ))}
      </ul>
    </div>
  )
}
