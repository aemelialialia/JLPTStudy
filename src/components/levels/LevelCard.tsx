import type { JLPTLevel } from '../../types/jlpt'
import type { LevelProgressSummary } from '../../services/vocabularyLearningService'
import type { GrammarLevelProgressSummary } from '../../services/grammarLessonService'

const LEVEL_DESCRIPTORS: Record<JLPTLevel, string> = {
  N5: 'Beginner',
  N4: 'Elementary',
  N3: 'Intermediate',
  N2: 'Upper-Intermediate',
}

export function LevelCard({
  level,
  vocabProgress,
  grammarProgress,
  isTarget,
  onSelect,
}: {
  level: JLPTLevel
  vocabProgress: LevelProgressSummary | undefined
  grammarProgress: GrammarLevelProgressSummary | undefined
  isTarget: boolean
  onSelect: () => void
}) {
  const vocabDetail =
    !vocabProgress || vocabProgress.total === 0
      ? 'no vocabulary imported'
      : `${vocabProgress.memorized}/${vocabProgress.total} words memorized`
  const grammarDetail =
    !grammarProgress || grammarProgress.total === 0
      ? 'no grammar points'
      : `${grammarProgress.studied}/${grammarProgress.total} grammar points studied`

  return (
    <li>
      <button
        type="button"
        className={'level-card squish-btn' + (isTarget ? ' level-card--active' : '')}
        onClick={onSelect}
        aria-pressed={isTarget}
      >
        <span className="level-card__left">
          <span className="level-card__badge">
            <span className="text-title-md">{level}</span>
          </span>
          <span>
            <p className="level-card__code text-title-md">{`JLPT ${level}`}</p>
            <p className="level-card__descriptor">{LEVEL_DESCRIPTORS[level]}</p>
            <p className="level-card__stats">{`${vocabDetail} · ${grammarDetail}`}</p>
          </span>
        </span>
        <span
          className={
            'level-card__target-indicator' +
            (isTarget ? ' level-card__target-indicator--active' : ' level-card__target-indicator--inactive')
          }
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }} data-fill={isTarget ? '1' : undefined}>
            {isTarget ? 'flag' : 'outlined_flag'}
          </span>
          {isTarget ? 'Target' : 'Set as target'}
        </span>
      </button>
    </li>
  )
}
