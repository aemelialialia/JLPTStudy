/** Current instant as an ISO 8601 timestamp string. */
export function nowISO(): string {
  return new Date().toISOString()
}

/** Today's calendar date as YYYY-MM-DD (local time), used as a stable key for "daily" records (daily quiz, daily study state, streaks). */
export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Whole calendar days from today until `dateISO` (YYYY-MM-DD), for the
 * Dashboard's JLPT Exam Countdown widget. Clamped at 0 for today or any
 * date already passed — the countdown should read "0 days" (exam day or
 * past), never a negative number.
 */
export function daysUntil(dateISO: string): number {
  const today = new Date(`${todayISODate()}T00:00:00Z`)
  const target = new Date(`${dateISO}T00:00:00Z`)
  const diffMs = target.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}
