import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { isJLPTLevel } from '../types/jlpt'
import { grammarLessonService } from '../services/grammarLessonService'
import { useGrammarLevelProgress } from '../hooks/useGrammarLevelProgress'
import { useImportedGrammarReady } from '../hooks/useImportedGrammarReady'
import { GrammarLevelSwitcher } from '../components/grammar/GrammarLevelSwitcher'
import { QuickTips } from '../components/grammar/QuickTips'
import { GrammarHeroCard, GrammarSecondaryCard } from '../components/grammar/GrammarPointCard'
import { GrammarPointList } from '../components/grammar/GrammarPointList'
import { GrammarQuizCTA } from '../components/grammar/GrammarQuizCTA'
import { GrammarImportSection } from '../components/grammar/GrammarImportSection'
import '../components/grammar/grammar.css'

/**
 * /grammar/:level — the Grammar hub (spec section 21 layout hierarchy:
 * Knowledge Points -> Continue Lesson -> Grammar Points -> Practice).
 * Matches the grammar_hub Stitch screen. Every card here opens a lesson
 * directly (never gates behind a quiz) or starts general level practice.
 */
export function GrammarHubPage() {
  const { level: levelParam } = useParams<{ level: string }>()
  const isValidLevel = isJLPTLevel(levelParam)
  const level = isValidLevel ? levelParam : 'N5'

  useImportedGrammarReady()
  // Re-renders after a successful import so `points` (a plain synchronous
  // read of grammarLessonService's merged cache, not memoized) picks up
  // the newly-imported entries immediately — see GrammarImportSection's
  // onImported.
  const [, setImportVersion] = useState(0)
  const points = grammarLessonService.getGrammarPoints(level)
  const { data: progress } = useGrammarLevelProgress(level)
  const studiedIds = new Set(progress?.studiedIds ?? [])

  if (!isValidLevel) {
    return (
      <section>
        <h1>Unknown level</h1>
        <p>&quot;{levelParam}&quot; is not a recognized JLPT level (expected N5, N4, N3, or N2).</p>
      </section>
    )
  }

  if (points.length === 0) {
    return (
      <section className="grammar-page">
        <GrammarLevelSwitcher level={level} />
        <div className="grammar-hero">
          <h1 className="text-display-lg">
            Grammar
            <br />
            <span className="grammar-hero__accent">Bunpō</span>
          </h1>
          <p>No {level} grammar points yet — check back after more content is added, or import your own below.</p>
        </div>
        <GrammarImportSection level={level} onImported={() => setImportVersion((v) => v + 1)} />
      </section>
    )
  }

  // Unstudied points first so "Continue Grammar Study" always surfaces
  // something new; once everything is studied this naturally settles
  // back to the content's original order.
  const priorityPoints = [...points.filter((p) => !studiedIds.has(p.id)), ...points.filter((p) => studiedIds.has(p.id))]
  const heroPoint = priorityPoints[0]
  const secondaryPoints = priorityPoints.slice(1, 3)

  return (
    <section className="grammar-page">
      <GrammarLevelSwitcher level={level} />

      <div className="grammar-hero">
        <h1 className="text-display-lg">
          Grammar
          <br />
          <span className="grammar-hero__accent">Bunpō</span>
        </h1>
        <p className="text-body-lg">Mastering the structural foundations.</p>
      </div>

      <QuickTips level={level} points={points} />

      <section>
        <div className="grammar-section__header">
          <h2 className="text-title-md">Current Lessons</h2>
          <a href="#grammar-point-list" className="text-label-sm" style={{ color: 'var(--color-primary)' }}>
            VIEW ALL
          </a>
        </div>
        <div className="grammar-lessons-grid">
          <GrammarHeroCard
            entry={heroPoint}
            studied={studiedIds.has(heroPoint.id)}
            slideCount={grammarLessonService.getSlides(heroPoint.id).length}
          />
          <div className="grammar-secondary-list">
            {secondaryPoints.map((entry) => (
              <GrammarSecondaryCard
                key={entry.id}
                entry={entry}
                studied={studiedIds.has(entry.id)}
                slideCount={grammarLessonService.getSlides(entry.id).length}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="grammar-point-list">
        <div className="grammar-section__header">
          <h2 className="text-title-md">{level} Grammar Points</h2>
        </div>
        <GrammarPointList points={points} studiedIds={studiedIds} />
      </section>

      <section>
        <GrammarQuizCTA
          title="Grammar Quizzes"
          description="Test your structural knowledge with focused multiple-choice practice."
          buttonLabel="Start Practice"
          to={`/grammar/${level}/quiz/practice`}
        />
      </section>

      <GrammarImportSection level={level} onImported={() => setImportVersion((v) => v + 1)} />
    </section>
  )
}
