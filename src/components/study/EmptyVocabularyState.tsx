import { Link } from 'react-router-dom'
import type { JLPTLevel } from '../../types/jlpt'
import './study.css'

/** Shown instead of a broken/empty flashcard screen when a level has no imported vocabulary (spec sections 2/19). */
export function EmptyVocabularyState({ level }: { level: JLPTLevel }) {
  return (
    <div className="study-banner">
      <h2>{level} Vocabulary</h2>
      <p style={{ margin: 0 }}>No vocabulary has been imported for this level.</p>
      <Link to={`/level/${level}`} className="study-btn study-btn--primary squish-btn">
        Import {level} Vocabulary
      </Link>
    </div>
  )
}
