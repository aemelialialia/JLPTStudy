import { Link } from 'react-router-dom'
import type { JLPTLevel } from '../../types/jlpt'
import '../vocabulary/vocabulary.css'
import './study.css'

/** Shown instead of a broken/empty flashcard screen when a level has no imported vocabulary (spec sections 2/19). */
export function EmptyVocabularyState({ level }: { level: JLPTLevel }) {
  return (
    <div className="study-banner">
      <h2>{level} Vocabulary</h2>
      <p>No vocabulary has been imported for this level.</p>
      <Link to={`/level/${level}`} className="vocab-button vocab-button--primary">
        Import {level} Vocabulary
      </Link>
    </div>
  )
}
