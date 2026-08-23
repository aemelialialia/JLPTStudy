import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { LevelPage } from './pages/LevelPage'
import { StudyIndexPage } from './pages/StudyIndexPage'
import { StudyPage } from './pages/StudyPage'
import { VocabQuizPage } from './pages/VocabQuizPage'
import { MistakeBook } from './pages/MistakeBook'
import { Settings } from './pages/Settings'
import { GrammarIndexPage } from './pages/GrammarIndexPage'
import { GrammarHubPage } from './pages/GrammarHubPage'
import { GrammarLessonPage } from './pages/GrammarLessonPage'
import { GrammarQuizPage } from './pages/GrammarQuizPage'
import { ProfilePage } from './pages/ProfilePage'
import { ResourcesPage } from './pages/ResourcesPage'
import { ConjugationIndexPage } from './pages/ConjugationIndexPage'
import { ConjugationCategoryPage } from './pages/ConjugationCategoryPage'
import { LevelSelectionPage } from './pages/LevelSelectionPage'

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
          <Route path="/study" element={<StudyIndexPage />} />
          <Route path="/study/:level/quiz" element={<VocabQuizPage />} />
          <Route path="/study/:level" element={<StudyPage />} />
          <Route path="/grammar" element={<GrammarIndexPage />} />
          <Route path="/grammar/lesson/:grammarPointId" element={<GrammarLessonPage />} />
          <Route path="/grammar/:level/quiz/:mode" element={<GrammarQuizPage />} />
          <Route path="/grammar/:level" element={<GrammarHubPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/resources/conjugation" element={<ConjugationIndexPage />} />
          <Route path="/resources/conjugation/:category" element={<ConjugationCategoryPage />} />
          <Route path="/levels" element={<LevelSelectionPage />} />
          <Route path="/mistakes" element={<MistakeBook />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </HashRouter>
  )
}
