import { Link } from 'react-router-dom'
import type { JLPTLevel } from '../../types/jlpt'

/**
 * "Practice More" horizontal scroller (Stitch dashboard screen). Only
 * links to features that actually exist today — the prototype's mockup
 * also shows a "Mixed Practice"/"JLPT Practice" pair, but the app has no
 * cross-level mixed-practice mode yet (spec section 3 forbids mixing
 * levels outside an explicit mode we haven't built), so this stays to
 * three real destinations rather than a dead-end card.
 */
export function PracticeMoreRow({ level }: { level: JLPTLevel }) {
  const items = [
    { to: `/study/${level}`, icon: 'translate', label: 'Vocabulary Study', variant: 'vocab' },
    { to: `/study/${level}/quiz`, icon: 'quiz', label: 'Vocabulary Quiz', variant: 'vocab' },
    { to: `/grammar/${level}/quiz/practice`, icon: 'menu_book', label: 'Grammar Quiz', variant: 'grammar' },
    { to: '/mistakes', icon: 'history_edu', label: 'Review Mistakes', variant: 'review' },
  ] as const

  return (
    <section>
      <h3 className="dashboard-practice-heading text-title-md">
        <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>
          apps
        </span>
        Practice More
      </h3>
      <div className="dashboard-practice-row hide-scrollbar">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={`dashboard-practice-card dashboard-practice-card--${item.variant} squish-btn spring-card`}>
            <span className="dashboard-practice-card__icon">
              <span className="material-symbols-outlined">{item.icon}</span>
            </span>
            <span className="dashboard-practice-card__label text-label-sm">{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
