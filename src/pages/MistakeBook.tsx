import { JLPT_LEVELS } from '../types/jlpt'
import { useMistakes } from '../hooks/useMistakes'
import { MistakeCard } from '../components/mistakes/MistakeCard'
import '../components/mistakes/mistakes.css'

/**
 * /mistakes — the Mistake Book (reached from Dashboard's Practice More
 * row). Every grammar question answered incorrectly shows up here,
 * grouped by level, each with a link back to the exact grammar lesson
 * slide that explains it — never just a raw log line.
 */
export function MistakeBook() {
  const { data: mistakes, loading } = useMistakes()

  const byLevel = JLPT_LEVELS.map((level) => ({
    level,
    items: (mistakes ?? []).filter((m) => m.level === level),
  })).filter((group) => group.items.length > 0)

  return (
    <section className="mistakes-page">
      <div className="mistakes-header">
        <h1 className="text-headline-lg">Mistake Book</h1>
        <p className="text-body-md">Questions you've missed, so you can go back and review the grammar behind them.</p>
      </div>

      {loading && <p>Loading…</p>}

      {!loading && byLevel.length === 0 && (
        <p className="mistakes-empty">No mistakes recorded yet — they'll show up here after your first grammar quiz.</p>
      )}

      {!loading &&
        byLevel.map((group) => (
          <div key={group.level} className="mistakes-level-group">
            <h2 className="mistakes-level-group__title text-title-md">{`JLPT ${group.level}`}</h2>
            {group.items.map((mistake) => (
              <MistakeCard key={mistake.id} mistake={mistake} />
            ))}
          </div>
        ))}
    </section>
  )
}
