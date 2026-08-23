import { Link } from 'react-router-dom'
import type { GrammarEntry } from '../../types/grammar'

interface GrammarPointCardProps {
  entry: GrammarEntry
  studied: boolean
  slideCount: number
}

/**
 * "Current Lessons" hero card (grammar_hub prototype: the large featured
 * card with the play button + progress dots). Used for the single
 * highest-priority point on the hub — spec's "Continue Grammar Study"
 * quick-access idea, scoped to the grammar hub itself.
 */
export function GrammarHeroCard({ entry, studied, slideCount }: GrammarPointCardProps) {
  const dotCount = Math.min(slideCount, 5)
  return (
    <Link to={`/grammar/lesson/${entry.id}`} className="grammar-hero-card spring-card pattern-asanoha">
      <div className="grammar-hero-card__top">
        <span className="grammar-hero-card__badge text-label-sm">{studied ? 'In Progress' : 'Must Do'}</span>
        <span className="material-symbols-outlined grammar-hero-card__icon">school</span>
      </div>
      <p className="grammar-hero-card__point text-headline-lg">{entry.grammarPoint}</p>
      <p className="grammar-hero-card__meaning">{entry.meaning}</p>
      <div className="grammar-hero-card__footer">
        <div className="grammar-hero-card__dots" aria-hidden="true">
          {Array.from({ length: dotCount }, (_, i) => (
            <div key={i} className={'grammar-hero-card__dot' + (studied ? ' grammar-hero-card__dot--studied' : '')} />
          ))}
        </div>
        <span className="grammar-hero-card__play">
          <span className="material-symbols-outlined" data-fill="1">
            play_arrow
          </span>
        </span>
      </div>
    </Link>
  )
}

/** Compact row card for the remaining "Current Lessons" picks. */
export function GrammarSecondaryCard({ entry, studied }: GrammarPointCardProps) {
  return (
    <Link to={`/grammar/lesson/${entry.id}`} className="grammar-secondary-card squish-btn">
      <div className="grammar-secondary-card__glyph">{entry.grammarPoint.charAt(0)}</div>
      <div className="grammar-secondary-card__body">
        <h4 className="grammar-secondary-card__title text-title-md">{entry.grammarPoint}</h4>
        <p className="grammar-secondary-card__meaning">{entry.meaning}</p>
      </div>
      {studied ? (
        <span className="material-symbols-outlined grammar-secondary-card__studied" data-fill="1">
          check_circle
        </span>
      ) : (
        <span className="material-symbols-outlined" style={{ color: 'var(--color-surface-variant)' }}>
          chevron_right
        </span>
      )}
    </Link>
  )
}
