import { Link } from 'react-router-dom'
import type { MistakeRecord } from '../../types/quiz'
import { getQuestionById, getGrammarEntryById } from '../../content/contentLoader'
// Reuses the grammar quiz's `.grammar-quiz__review-link` pill style
// rather than duplicating an identical "review this grammar" link —
// same pragmatic reuse as VocabQuizPage's use of GrammarQuizOption.
import '../grammar/grammar.css'

/** One mistake: the question, what was answered vs. correct, and a link back to the grammar explanation. */
export function MistakeCard({ mistake }: { mistake: MistakeRecord }) {
  const question = getQuestionById(mistake.questionId)
  const grammarEntry = getGrammarEntryById(mistake.grammarPointId)

  const params = new URLSearchParams()
  if (question?.lessonSlideId) params.set('slide', question.lessonSlideId)
  const reviewHref = `/grammar/lesson/${mistake.grammarPointId}?${params.toString()}`

  return (
    <div className="mistake-card">
      {grammarEntry && <p className="mistake-card__point text-label-sm">{grammarEntry.grammarPoint}</p>}
      <p className="mistake-card__question text-body-md">{question?.questionText ?? 'Question no longer available'}</p>
      <div className="mistake-card__answers">
        <span className="mistake-card__answer--wrong">{`Your answer: ${mistake.selectedAnswer}`}</span>
        <span className="mistake-card__answer--correct">{`Correct answer: ${mistake.correctAnswer}`}</span>
      </div>
      <div className="mistake-card__footer">
        <Link to={reviewHref} className="grammar-quiz__review-link squish-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            menu_book
          </span>
          Review this grammar
        </Link>
        {mistake.mastered && (
          <span className="mistake-card__mastered">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              check_circle
            </span>
            Mastered
          </span>
        )}
      </div>
    </div>
  )
}
