import { Link } from 'react-router-dom'
import { JLPT_LEVELS } from '../types/jlpt'
import { useLevelProgress } from '../hooks/useLevelProgress'
import { useMistakes } from '../hooks/useMistakes'
import { StatCard } from '../components/common/StatCard'
import type { JLPTLevel } from '../types/jlpt'

function LevelSummaryRow({ level }: { level: JLPTLevel }) {
  const { data, loading } = useLevelProgress(level)
  return (
    <li className="dashboard__level-row">
      <Link to={`/level/${level}`}>{level}</Link>
      <span>
        {loading || !data
          ? 'loading…'
          : data.total === 0
            ? 'no vocabulary imported yet'
            : `${data.memorized}/${data.total} memorized`}
      </span>
    </li>
  )
}

/**
 * Placeholder dashboard — only exists to verify the app shell, routing,
 * and data layer work end to end. The real Dashboard UI comes from the
 * Stitch design later.
 */
export function Dashboard() {
  const { data: mistakes } = useMistakes()

  return (
    <section>
      <h1>JLPT Study — Dashboard</h1>
      <p>This is a placeholder shell used to verify the technical foundation. No final design yet.</p>

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', margin: '0 0 var(--space-6)' }}>
        <StatCard label="Mistakes to review" value={mistakes?.length ?? '—'} />
      </div>

      <h2>Levels</h2>
      <ul>
        {JLPT_LEVELS.map((level) => (
          <LevelSummaryRow key={level} level={level} />
        ))}
      </ul>
    </section>
  )
}
