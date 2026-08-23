import type { GrammarLevelProgressSummary } from '../../services/grammarLessonService'

/**
 * One level's grammar-progress row: a filled checkmark bubble per studied
 * point, then a dashed numbered bubble per remaining point (Stitch
 * `learner_profile` Grammar card). Bubble count scales with real content,
 * not a fixed mock count — an N-level with only a handful of curated
 * points shows a handful of bubbles.
 */
export function GrammarBubbleRow({ progress }: { progress: GrammarLevelProgressSummary }) {
  const remaining = progress.total - progress.studied

  return (
    <div className="profile-bubble-row">
      <span className="profile-bubble-row__level text-label-sm">{progress.level}</span>
      <div className="profile-bubble-row__bubbles">
        {Array.from({ length: progress.studied }, (_, i) => (
          <span key={`done-${i}`} className="profile-bubble profile-bubble--done" aria-hidden="true">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              check
            </span>
          </span>
        ))}
        {Array.from({ length: remaining }, (_, i) => (
          <span key={`todo-${i}`} className="profile-bubble profile-bubble--todo" aria-hidden="true">
            {progress.studied + i + 1}
          </span>
        ))}
      </div>
      <span className="text-label-sm" style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}>
        {`${progress.studied}/${progress.total}`}
      </span>
    </div>
  )
}
