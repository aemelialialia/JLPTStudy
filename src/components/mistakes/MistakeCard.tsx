import { Link } from 'react-router-dom'
import type { MistakeRecord } from '../../types/quiz'
import { getQuestionById, getGrammarEntryById } from '../../content/contentLoader'
// Reuses the grammar quiz's `.grammar-quiz__review-link` pill style
// rather than duplicating an identical "review this grammar" link —
// same pragmatic reuse as VocabQuizPage's use of GrammarQuizOption.
import '../grammar/grammar.css'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** One mistake: the question, what was answered vs. correct, wrong/correct-streak stats, mastery status, and a link back to the grammar explanation (Phase 5 spec section 19). */
export function MistakeCard({ mistake }: { mistake: MistakeRecord }) {
  const question = getQuestionById(mistake.questionId)
  const grammarEntry = getGrammarEntryById(mistake.grammarPointId)

  const params = new URLSearchParams()
  if (question?.lessonSlideId) params.set('slide', question.lessonSlideId)
  const reviewHref = `/grammar/lesson/${mistake.grammarPointId}?${params.toString()}`

  return (
    <div className={'mistake-card' + (mistake.mastered ? ' mistake-card--mastered' : '')}>
      <div className="mistake-card__top">
        {grammarEntry && <p className="mistake-card__point text-label-sm">{grammarEntry.grammarPoint}</p>}
        <span className={'mistake-card__status' + (mistake.mastered ? ' mistake-card__status--mastered' : ' mistake-card__status--active')}>
          <span className="material-symbols-outlined" data-fill="1" style={{ fontSize: 14 }}>
            {mistake.mastered ? 'check_circle' : 'radio_button_unchecked'}
          </span>
          {mistake.mastered ? 'Mastered' : 'Active'}
        </span>
      </div>
      <p className="mistake-card__question text-body-md">{question?.questionText ?? 'Question no longer available'}</p>
      <div className="mistake-card__answers">
        <span className="mistake-card__answer--wrong">{`Your last answer: ${mistake.selectedAnswer}`}</span>
        <span className="mistake-card__answer--correct">{`Correct answer: ${mistake.correctAnswer}`}</span>
      </div>
      <div className="mistake-card__stats text-label-sm">
        <span>{`Wrong ${mistake.timesWrong}× · last ${formatDate(mistake.lastWrongAt)}`}</span>
        {mistake.timesCorrect > 0 && <span>{`Correct ${mistake.timesCorrect}×`}</span>}
        {!mistake.mastered && mistake.consecutiveCorrect > 0 && (
          <span>{`${mistake.consecutiveCorrect}/3 in a row to master`}</span>
        )}
      </div>
      <div className="mistake-card__footer">
        <Link to={reviewHref} className="grammar-quiz__review-link squish-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            menu_book
          </span>
          Review this grammar
        </Link>
      </div>
    </div>
  )
}
