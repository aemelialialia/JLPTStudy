import { Link } from 'react-router-dom'
import { JLPT_LEVELS } from '../../types/jlpt'
import type { JLPTLevel } from '../../types/jlpt'

/**
 * Compact pill row for jumping between levels without leaving the
 * grammar section (spec: "JLPT-level filtering" must stay easy to reach).
 * Only rendered on hub-style pages — the lesson viewer and quiz are
 * deliberately linear/focused and omit it, matching the prototype's
 * "Suppressed Nav Shells due to focused linear task intent" note.
 */
export function GrammarLevelSwitcher({ level }: { level: JLPTLevel }) {
  return (
    <nav className="grammar-level-switcher" aria-label="Grammar level">
      {JLPT_LEVELS.map((l) => (
        <Link
          key={l}
          to={`/grammar/${l}`}
          className={'grammar-level-switcher__pill' + (l === level ? ' grammar-level-switcher__pill--active' : '')}
          aria-current={l === level ? 'page' : undefined}
        >
          {l}
        </Link>
      ))}
    </nav>
  )
}
