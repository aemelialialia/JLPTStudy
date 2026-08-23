/**
 * Inline SVG "learner" avatar — a lightweight local stand-in for the
 * Stitch prototype's hotlinked, externally-generated avatar images. Kept
 * intentionally simple (a friendly round face) so it costs nothing to
 * ship, works offline, and never depends on a third-party image host.
 */
export function Avatar({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="Your avatar">
      <circle cx="20" cy="20" r="20" fill="var(--color-primary-container)" />
      <circle cx="20" cy="17" r="8" fill="var(--color-surface-container-lowest)" />
      <path
        d="M6 38c1.5-9 7-14 14-14s12.5 5 14 14"
        fill="var(--color-surface-container-lowest)"
      />
      <circle cx="17" cy="17" r="1.4" fill="var(--color-on-surface)" />
      <circle cx="23" cy="17" r="1.4" fill="var(--color-on-surface)" />
      <path d="M17.5 20.5q2.5 2 5 0" stroke="var(--color-on-surface)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  )
}
