import type { ReactNode } from 'react'
import { NavBar } from './NavBar'
import './AppShell.css'

/**
 * The only layout component in this foundation step. It composes
 * navigation + page content and nothing else — no page knows about the
 * shell, and the shell knows nothing about vocabulary/grammar/quiz data.
 * This is the seam the future Stitch layout replaces.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <main className="app-shell__content">{children}</main>
      <NavBar />
    </div>
  )
}
