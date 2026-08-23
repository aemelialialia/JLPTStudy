import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { LevelPage } from './pages/LevelPage'
import { MistakeBook } from './pages/MistakeBook'
import { Settings } from './pages/Settings'

/**
 * HashRouter (not BrowserRouter) is used deliberately: GitHub Pages
 * serves a static file tree with no server-side rewrite rules, so a
 * deep link or a page refresh on e.g. /level/N3 with BrowserRouter would
 * 404. Hash-based routes (/#/level/N3) are always resolved client-side
 * by the single index.html, which is the simplest reliable approach for
 * static hosting without extra build-time configuration (a 404.html
 * redirect trick) or knowing the repo's subpath in advance.
 */
export function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/level/:level" element={<LevelPage />} />
          <Route path="/mistakes" element={<MistakeBook />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </HashRouter>
  )
}
