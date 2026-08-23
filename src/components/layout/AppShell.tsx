import { useState, type ReactNode } from 'react'
import { TopAppBar } from './TopAppBar'
import { NavDrawer } from './NavDrawer'
import { BottomNav } from './BottomNav'
import { LoadingScreen } from './LoadingScreen'
import './AppShell.css'

/**
 * The app's single layout component: top app bar + slide-out drawer +
 * bottom/top navigation, wrapping every routed page. No page knows about
 * the shell, and the shell knows nothing about vocabulary/grammar/quiz
 * data — it only composes chrome.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="app-shell pattern-asanoha">
      <LoadingScreen />
      <TopAppBar onMenuClick={() => setDrawerOpen(true)} />
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main className="app-shell__content">{children}</main>
      <BottomNav />
    </div>
  )
}
