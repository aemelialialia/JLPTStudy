/**
 * Inline SVG mascot logo — a lightweight, locally-drawn stand-in for the
 * Stitch prototype's generated "cute あ character" artwork
 * (nihongo_study_logo/screen.png). Stitch's actual PNG was produced by an
 * external image model and hotlinked from Google's asset CDN in the
 * prototype export; shipping this app against that same URL would mean
 * a network dependency on someone else's generated-image hosting for a
 * core piece of branding, so a small hand-drawn SVG in the same peach
 * rounded-square + kawaii-face style is used instead. Same visual idea,
 * zero network weight, works offline.
 */
export function AppLogo({ size = 128 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      role="img"
      aria-label="Michi logo"
    >
      <rect width="128" height="128" rx="32" fill="var(--color-secondary-container)" />
      <path
        d="M40 40h48M64 40v14M40 62h48M50 54c0 18-8 30-18 36M78 54c0 18 8 30 18 36"
        stroke="var(--color-on-secondary-container)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.9"
      />
      <circle cx="52" cy="88" r="3.5" fill="var(--color-on-secondary-container)" />
      <circle cx="76" cy="88" r="3.5" fill="var(--color-on-secondary-container)" />
      <path
        d="M58 96q6 5 12 0"
        stroke="var(--color-on-secondary-container)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="44" cy="94" r="4" fill="var(--color-secondary)" opacity="0.4" />
      <circle cx="84" cy="94" r="4" fill="var(--color-secondary)" opacity="0.4" />
    </svg>
  )
}
