import { useEffect, useState } from 'react'
import { ShaderBackground } from './ShaderBackground'
import { AppLogo } from './AppLogo'
import './LoadingScreen.css'

const VISIBLE_MS = 1100
const EXIT_MS = 600

/**
 * The approved loading screen (spec section 24): a cute, lightweight
 * breathing-wave shader behind a frosted logo card, shown briefly on
 * cold start. It is purely cosmetic and never blocks anything — the
 * rest of the app mounts and starts its own (per-page) data loading
 * underneath it immediately; this is just an overlay that fades away.
 */
export function LoadingScreen() {
  const [phase, setPhase] = useState<'visible' | 'exiting' | 'gone'>('visible')

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setPhase('exiting'), VISIBLE_MS)
    const goneTimer = window.setTimeout(() => setPhase('gone'), VISIBLE_MS + EXIT_MS)
    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(goneTimer)
    }
  }, [])

  if (phase === 'gone') return null

  return (
    <div
      className={'loading-screen' + (phase === 'exiting' ? ' loading-screen--exiting' : '')}
      role="status"
      aria-label="Loading Michi"
    >
      <ShaderBackground className="loading-screen__shader" />
      <div className="loading-screen__pattern pattern-asanoha" />
      <div className="loading-screen__card">
        <AppLogo size={112} />
        <div>
          <h1 className="text-display-lg loading-screen__title">Michi</h1>
          <p className="text-body-md loading-screen__subtitle">Soft Productivity.</p>
        </div>
        <div className="loading-screen__dots" aria-hidden="true">
          <span className="loading-screen__dot" />
          <span className="loading-screen__dot" />
          <span className="loading-screen__dot" />
        </div>
      </div>
    </div>
  )
}
