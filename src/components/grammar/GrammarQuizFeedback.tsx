import { Link } from 'react-router-dom'

interface GrammarQuizFeedbackProps {
  isCorrect: boolean
  explanation: string
  reviewHref: string
}

/**
 * Immediate answer feedback (spec section 13) plus the "Review this
 * grammar" reference (spec sections 10-12). The review link is deliberately
 * a small secondary pill — visually SUBORDINATE to the answer choices
 * above it, never the primary action on this screen.
 */
export function GrammarQuizFeedback({ isCorrect, explanation, reviewHref }: GrammarQuizFeedbackProps) {
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
