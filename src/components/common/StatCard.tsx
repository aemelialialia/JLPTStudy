import './StatCard.css'

/**
 * Purely presentational: receives data via props, has no idea where the
 * numbers came from (IndexedDB, static content, or a test fixture). This
 * is the pattern every future presentation component should follow —
 * "receives data + actions" rather than reading storage itself.
 */
export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat-card">
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  )
}
