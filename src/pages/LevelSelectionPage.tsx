import { JLPT_LEVELS, isJLPTLevel } from '../types/jlpt'
import { useUserSettings } from '../hooks/useUserSettings'
import { useLevelOverview } from '../hooks/useLevelOverview'
import { LevelCard } from '../components/levels/LevelCard'
import '../components/levels/levels.css'

/**
 * /levels — "JLPT Level Selection" (drawer destination, spec section 8).
 * Lets the user pick which level they're aiming for (drives the
 * Dashboard/Profile target badges and countdown) and set their exam
 * date, while showing real per-level vocabulary/grammar progress so the
 * choice is informed rather than blind.
 */
export function LevelSelectionPage() {
  const { settings, update } = useUserSettings()
  const { data } = useLevelOverview()

  const targetLevel = isJLPTLevel(settings?.targetLevel) ? settings.targetLevel : null

  function findVocab(level: (typeof JLPT_LEVELS)[number]) {
    return data?.vocabByLevel.find((p) => p.level === level)
  }
  function findGrammar(level: (typeof JLPT_LEVELS)[number]) {
    return data?.grammarByLevel.find((p) => p.level === level)
  }

  return (
    <section className="levels-page">
      <div className="levels-header">
        <h1 className="text-headline-lg">JLPT Level Selection</h1>
        <p className="text-body-md">Choose the level you're aiming to pass — this drives your dashboard countdown and progress goals.</p>
      </div>

      <ul className="levels-list">
        {JLPT_LEVELS.map((level) => (
          <LevelCard
            key={level}
            level={level}
            vocabProgress={findVocab(level)}
            grammarProgress={findGrammar(level)}
            isTarget={targetLevel === level}
            onSelect={() => update({ targetLevel: level })}
          />
        ))}
      </ul>

      <div className="levels-exam-date">
        <label htmlFor="exam-date-input">
          <span className="text-title-md">Exam date</span>
          <input
            id="exam-date-input"
            type="date"
            value={settings?.examDate ?? ''}
            onChange={(e) => update({ examDate: e.target.value || null })}
          />
        </label>
        <p className="levels-exam-date__hint">Used for the countdown on your Dashboard. Leave blank if you haven't registered yet.</p>
      </div>
    </section>
  )
}
