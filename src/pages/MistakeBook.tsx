import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { JLPT_LEVELS } from '../types/jlpt'
import { useMistakes } from '../hooks/useMistakes'
import { grammarLessonService } from '../services/grammarLessonService'
import { MistakeCard } from '../components/mistakes/MistakeCard'
import '../components/mistakes/mistakes.css'
import '../components/study/study.css'

type StatusFilter = 'all' | 'active' | 'mastered'

/**
 * /mistakes — the Mistake Book / 錯題本 (reached from Dashboard's Practice
 * More row). Every grammar question answered incorrectly shows up here,
 * grouped by level, each with its Active/Mastered status, wrong/correct
 * history, and a link back to the exact grammar lesson slide that
 * explains it (Phase 5 spec section 19). Active/Mastered and
 * grammar-point filters narrow the list; each level with at least one
 * Active mistake gets a "Practice Mistakes" entry point into a quiz
 * session built from exactly that level's Active mistakes (spec sections
 * 6-7) — reusing the same grammar quiz engine as every other quiz mode.
 */
export function MistakeBook() {
  const { data: mistakes, loading } = useMistakes()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [grammarPointFilter, setGrammarPointFilter] = useState<string>('all')

  const grammarPointOptions = useMemo(() => {
    const ids = new Set((mistakes ?? []).map((m) => m.grammarPointId))
    return Array.from(ids)
      .map((id) => ({ id, entry: grammarLessonService.getGrammarPoint(id) }))
      .sort((a, b) => (a.entry?.grammarPoint ?? '').localeCompare(b.entry?.grammarPoint ?? ''))
  }, [mistakes])

  const filtered = (mistakes ?? [])
    .filter((m) => statusFilter === 'all' || (statusFilter === 'active' ? !m.mastered : m.mastered))
    .filter((m) => grammarPointFilter === 'all' || m.grammarPointId === grammarPointFilter)

  const byLevel = JLPT_LEVELS.map((level) => ({
    level,
    items: filtered.filter((m) => m.level === level),
    // "Practice Mistakes" always draws from ALL Active mistakes for the
    // level (not the currently-applied filters) — the filters here are
    // for browsing/reviewing, not for scoping what a practice session covers.
    activeCount: (mistakes ?? []).filter((m) => m.level === level && !m.mastered).length,
  })).filter((group) => group.items.length > 0)

  return (
    <section className="mistakes-page">
      <div className="mistakes-header">
        <h1 className="text-headline-lg">Mistake Book</h1>
        <p className="text-body-md">Questions you've missed, so you can go back and review the grammar behind them.</p>
      </div>

      {!loading && (mistakes?.length ?? 0) > 0 && (
        <div className="mistakes-filters">
          <div className="mistakes-filter-tabs">
            {(['all', 'active', 'mastered'] as StatusFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                className={'mistakes-filter-tab' + (statusFilter === option ? ' mistakes-filter-tab--active' : '')}
                onClick={() => setStatusFilter(option)}
              >
                {option === 'all' ? 'All' : option === 'active' ? 'Active' : 'Mastered'}
              </button>
            ))}
          </div>
          {grammarPointOptions.length > 1 && (
            <select
              className="mistakes-filter-select"
              value={grammarPointFilter}
              onChange={(e) => setGrammarPointFilter(e.target.value)}
              aria-label="Filter by grammar point"
            >
              <option value="all">All grammar points</option>
              {grammarPointOptions.map(({ id, entry }) => (
                <option key={id} value={id}>
                  {entry?.grammarPoint ?? id}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {loading && <p>Loading…</p>}

      {!loading && (mistakes?.length ?? 0) === 0 && (
        <p className="mistakes-empty">No mistakes recorded yet — they'll show up here after your first grammar quiz.</p>
      )}

      {!loading && (mistakes?.length ?? 0) > 0 && byLevel.length === 0 && (
        <p className="mistakes-empty">No mistakes match these filters.</p>
      )}

      {!loading &&
        byLevel.map((group) => (
          <div key={group.level} className="mistakes-level-group">
            <div className="mistakes-level-group__header">
              <h2 className="mistakes-level-group__title text-title-md">{`JLPT ${group.level}`}</h2>
              {group.activeCount > 0 && (
                <Link to={`/grammar/${group.level}/quiz/mistakes`} className="study-btn study-btn--primary squish-btn mistakes-practice-cta">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    replay
                  </span>
                  Practice Mistakes
                </Link>
              )}
            </div>
            {group.items.map((mistake) => (
              <MistakeCard key={mistake.id} mistake={mistake} />
            ))}
          </div>
        ))}
    </section>
  )
}
