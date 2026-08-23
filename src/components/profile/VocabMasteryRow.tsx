import type { LevelProgressSummary } from '../../services/vocabularyLearningService'

/** One "N5 ... 68% (34/50)" mastery bar (Stitch `learner_profile` Vocabulary card). */
export function VocabMasteryRow({ progress }: { progress: LevelProgressSummary }) {
  const pct = progress.total === 0 ? 0 : Math.round((progress.memorized / progress.total) * 100)

  return (
    <div className="profile-mastery-row">
      <div className="profile-mastery-row__header">
        <span className="profile-mastery-row__label text-title-md">{progress.level}</span>
        <span className="profile-mastery-row__value">{`${pct}% (${progress.memorized}/${progress.total})`}</span>
      </div>
      <div
        className="profile-mastery-row__track"
        role="progressbar"
        aria-label={`${progress.level} vocabulary mastery`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="profile-mastery-row__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
