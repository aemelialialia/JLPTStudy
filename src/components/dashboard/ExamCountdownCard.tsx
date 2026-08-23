import { Link } from 'react-router-dom'
import { daysUntil } from '../../utils/date'

interface ExamCountdownCardProps {
  targetLevel: string | null
  examDate: string | null
}

/** "JLPT Exam Countdown" widget (spec section 6, Stitch dashboard screen). */
export function ExamCountdownCard({ targetLevel, examDate }: ExamCountdownCardProps) {
  if (!targetLevel || !examDate) {
    return (
      <Link to="/levels" className="dashboard-countdown-card squish-btn">
        <div>
          <span className="dashboard-countdown-card__badge text-label-sm">Target</span>
          <p className="dashboard-countdown-card__level text-title-md">Set your JLPT goal</p>
        </div>
        <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)' }}>
          chevron_right
        </span>
      </Link>
    )
  }

  const days = daysUntil(examDate)

  return (
    <div className="dashboard-countdown-card spring-card">
      <div>
        <span className="dashboard-countdown-card__badge text-label-sm">Target</span>
        <p className="dashboard-countdown-card__level text-title-md">{`JLPT ${targetLevel}`}</p>
      </div>
      <div className="dashboard-countdown-card__days">
        <span className="dashboard-countdown-card__days-value text-headline-lg-mobile">{days}</span>
        <span className="dashboard-countdown-card__days-label">Days</span>
      </div>
    </div>
  )
}
