import { Link } from 'react-router-dom'

interface GrammarQuizFeedbackProps {
  isCorrect: boolean
  explanation: string
  reviewHref: string
  /** True when this wrong answer was just recorded in (or refreshed in) the Mistake Book — surfaces the explicit confirmation the Phase 5 spec asks for. */
  mistakeRecorded?: boolean
  /** True when this correct answer just pushed a previously-Active mistake to Mastered. */
  mistakeMastered?: boolean
}

/**
 * Immediate answer feedback (spec section 13/14) plus the "Review this
 * grammar" reference (spec sections 10-12). The review link is deliberately
 * a small secondary pill — visually SUBORDINATE to the answer choices
 * above it, never the primary action on this screen. On a wrong answer,
 * also confirms the mistake was added to the Mistake Book; on a correct
 * answer that completes the 3-in-a-row mastery streak, celebrates it.
 */
export function GrammarQuizFeedback({ isCorrect, explanation, reviewHref, mistakeRecorded, mistakeMastered }: GrammarQuizFeedbackProps) {
  return (
    <div className={'grammar-quiz__feedback' + (isCorrect ? ' grammar-quiz__feedback--correct' : ' grammar-quiz__feedback--incorrect')}>
      <div className="grammar-quiz__feedback-main">
        <div className={'grammar-quiz__feedback-icon' + (isCorrect ? ' grammar-quiz__feedback-icon--correct' : ' grammar-quiz__feedback-icon--incorrect')}>
          <span className="material-symbols-outlined" data-fill="1">
            {isCorrect ? 'check' : 'close'}
          </span>
        </div>
        <div>
          <h3 className="grammar-quiz__feedback-title text-title-md">{isCorrect ? 'Correct!' : 'Incorrect'}</h3>
          {explanation && <p className="grammar-quiz__feedback-explanation">{explanation}</p>}
          {!isCorrect && mistakeRecorded && (
            <p className="grammar-quiz__feedback-note">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                history_edu
              </span>
              Added to your Mistake Book
            </p>
          )}
          {isCorrect && mistakeMastered && (
            <p className="grammar-quiz__feedback-note grammar-quiz__feedback-note--mastered">
              <span className="material-symbols-outlined" data-fill="1" style={{ fontSize: 14 }}>
                check_circle
              </span>
              Mastered! Cleared from your active mistakes.
            </p>
          )}
        </div>
      </div>
      <Link to={reviewHref} className="grammar-quiz__review-link squish-btn">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          menu_book
        </span>
        Review this grammar
      </Link>
    </div>
  )
}
