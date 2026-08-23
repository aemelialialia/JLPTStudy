import { Link } from 'react-router-dom'
import type { JLPTLevel } from '../../types/jlpt'
import type { GrammarQuestion } from '../../types/question'
import type { GrammarQuizSession } from '../../types/grammarQuizSession'
import { grammarLessonService } from '../../services/grammarLessonService'

interface DailyGrammarQuizCardProps {
  level: JLPTLevel
  session: GrammarQuizSession
  previewQuestion: GrammarQuestion | null
}

/**
 * "Daily Grammar Quiz" card (spec section 8) — clearly distinguished from
 * general grammar practice by its own dedicated card and route
 * (`/grammar/:level/quiz/daily`). Previews the first question's actual
 * grammar point rather than a placeholder, and reflects real session
 * state: not started / in progress / already completed today.
 */
export function DailyGrammarQuizCard({ level, session, previewQuestion }: DailyGrammarQuizCardProps) {
  const point = previewQuestion ? grammarLessonService.getGrammarPoint(previewQuestion.grammarPointId) : undefined
  const isComplete = session.status === 'completed'
  const hasStarted = session.answers.length > 0
  const buttonLabel = isComplete ? 'Review Quiz' : hasStarted ? 'Continue Quiz' : 'Start Quiz'

  return (
    <div className="dashboard-grammar-card spring-card">
      <div>
        <div className="dashboard-grammar-card__header">
          <h3 className="dashboard-grammar-card__title text-title-md">Daily Grammar</h3>
          <span className="material-symbols-outlined" data-fill="1" style={{ color: 'var(--color-tertiary)' }}>
            {isComplete ? 'check_circle' : 'lightbulb'}
          </span>
        </div>
        <div className="dashboard-grammar-card__preview">
          {point ? (
            <>
              <p className="dashboard-grammar-card__preview-point text-headline-lg-mobile">{point.grammarPoint}</p>
              <p className="dashboard-grammar-card__preview-meaning text-label-sm">{point.meaning}</p>
            </>
          ) : (
            <p className="dashboard-grammar-card__preview-meaning text-label-sm">{`${level} / ${session.questionIds.length} Questions`}</p>
          )}
        </div>
      </div>
      <Link to={`/grammar/${level}/quiz/daily`} className="dashboard-grammar-card__cta squish-btn">
        {buttonLabel}
        <span className="material-symbols-outlined" data-fill="1">
          {isComplete ? 'visibility' : 'play_arrow'}
        </span>
      </Link>
    </div>
  )
}
