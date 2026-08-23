import { Link } from 'react-router-dom'
import type { GrammarEntry } from '../../types/grammar'

/**
 * The full grammar-point browse list for a level (spec section 4:
 * "Grammar tab provides easy browsing... each point clickable, opens
 * lesson slides directly — user must NOT have to start a quiz first").
 */
export function GrammarPointList({ points, studiedIds }: { points: GrammarEntry[]; studiedIds: Set<string> }) {
  if (points.length === 0) {
    return (
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        No grammar points for this level yet.
      </p>
    )
  }

  return (
    <ul className="grammar-point-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {points.map((entry) => {
        const studied = studiedIds.has(entry.id)
        return (
          <li key={entry.id}>
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
          </li>
        )
      })}
    </ul>
  )
}
