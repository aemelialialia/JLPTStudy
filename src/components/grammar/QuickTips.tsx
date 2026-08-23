import { Link } from 'react-router-dom'
import type { GrammarEntry } from '../../types/grammar'
import { grammarSlideId } from '../../types/grammar'
import type { JLPTLevel } from '../../types/jlpt'

const MAX_TIPS = 3

/**
 * "Quick Tips" horizontal scroller (grammar_hub prototype screen).
 * Deliberately draws only from the CURRENT level's grammar points — the
 * prototype's mockup mixes N2/N3/N4 for visual variety, but spec section
 * 3 forbids mixing levels outside an explicit mixed-practice mode, so
 * real content here stays single-level. Prefers points with a "notes"
 * field (genuinely tip-worthy nuance) before falling back to plain
 * meanings, so the strip is never empty for a level whose entries lack notes.
 */
export function QuickTips({ level, points }: { level: JLPTLevel; points: GrammarEntry[] }) {
  const withNotes = points.filter((p) => p.notes?.trim())
  const rest = points.filter((p) => !p.notes?.trim())
  const tips = [...withNotes, ...rest].slice(0, MAX_TIPS)

  if (tips.length === 0) return null

  return (
    <section>
      <div className="grammar-section__header">
        <h2 className="text-title-md">Quick Tips</h2>
        <span className="material-symbols-outlined" style={{ color: 'var(--color-tertiary-fixed-dim)' }}>
          tips_and_updates
        </span>
      </div>
      <div className="grammar-quick-tips hide-scrollbar">
        {tips.map((point) => (
          <Link
            key={point.id}
            to={`/grammar/lesson/${point.id}${point.notes?.trim() ? `?slide=${grammarSlideId(point.id, 'notes')}` : ''}`}
            className={`grammar-quick-tip grammar-quick-tip--${level} squish-btn`}
          >
            <span className="grammar-quick-tip__badge text-label-sm">
              <span>{`JLPT ${level}`}</span>
              {point.notes?.trim() && (
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  auto_awesome
                </span>
              )}
            </span>
            <p className="grammar-quick-tip__title text-title-md">{point.grammarPoint}</p>
            <p className="grammar-quick-tip__desc">{point.notes?.trim() || point.meaning}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
