import { useParams } from 'react-router-dom'
import { isJLPTLevel } from '../types/jlpt'
import { useLevelProgress } from '../hooks/useLevelProgress'
import { useMistakes } from '../hooks/useMistakes'
import { useContentCounts } from '../hooks/useContentCounts'
import { StatCard } from '../components/common/StatCard'

/**
 * One reusable page for all four levels (routed as /level/:level) rather
 * than four separate N5Page/N4Page/N3Page/N2Page components — the level
 * is just data that flows into the same hooks/services. Placeholder
 * only: read-only stats to prove vocabulary, content, and quiz data all
 * wire up correctly for a given level. No flashcard/grammar/quiz UI yet.
 */
export function LevelPage() {
  const { level: levelParam } = useParams<{ level: string }>()
  const isValidLevel = isJLPTLevel(levelParam)

  // Hooks must run unconditionally on every render (rules-of-hooks), so an
  // invalid :level param falls back to N5 here purely to keep the types
  // happy — its result is simply never rendered when isValidLevel is false.
  const level = isValidLevel ? levelParam : 'N5'
  const { data: progress, loading: progressLoading } = useLevelProgress(level)
  const { data: mistakes } = useMistakes(level)
  const { grammarCount, questionCount } = useContentCounts(level)

  if (!isValidLevel) {
    return (
      <section>
        <h1>Unknown level</h1>
        <p>"{levelParam}" is not a recognized JLPT level (expected N5, N4, N3, or N2).</p>
      </section>
    )
  }

  return (
    <section>
      <h1>{level}</h1>
      <p>Placeholder level overview — verifies vocabulary, grammar, and question data are all reachable for this level.</p>

      <h2>Vocabulary</h2>
      {progressLoading || !progress ? (
        <p>Loading…</p>
      ) : progress.total === 0 ? (
        <p>No vocabulary imported for {level} yet.</p>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <StatCard label="Total" value={progress.total} />
          <StatCard label="New" value={progress.new} />
          <StatCard label="Learning" value={progress.learning} />
          <StatCard label="Memorized" value={progress.memorized} />
        </div>
      )}

      <h2>Grammar</h2>
      <p>{grammarCount} grammar point{grammarCount === 1 ? '' : 's'} curated for {level}.</p>

      <h2>Quiz</h2>
      <p>
        {questionCount} question{questionCount === 1 ? '' : 's'} available · {mistakes?.length ?? 0} in
        your Mistake Book for this level.
      </p>
    </section>
  )
}
