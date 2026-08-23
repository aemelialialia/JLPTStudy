import { Link } from 'react-router-dom'

interface GrammarQuizCTAProps {
  title: string
  description: string
  buttonLabel: string
  to: string
}

/**
 * Reusable "start a grammar quiz" banner (grammar_hub prototype's dark
 * "Grammar Quizzes / Start Practice" panel). Deliberately generic — the
 * Grammar hub uses it for general level practice, and the Dashboard's
 * Daily Grammar Quiz card (task #43) can reuse the same visual language
 * with different copy/target route.
 */
export function GrammarQuizCTA({ title, description, buttonLabel, to }: GrammarQuizCTAProps) {
  return (
    <div className="grammar-practice-banner spring-card">
      <div className="grammar-practice-banner__decor" aria-hidden="true" />
      <div>
        <h2 className="text-headline-lg-mobile">{title}</h2>
        <p>{description}</p>
      </div>
      <Link to={to} className="grammar-practice-banner__cta squish-btn">
        <span>{buttonLabel}</span>
        <span className="material-symbols-outlined" data-fill="1">
          edit_document
        </span>
      </Link>
    </div>
  )
}
