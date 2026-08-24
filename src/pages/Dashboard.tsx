import { isJLPTLevel } from '../types/jlpt'
import { useUserSettings } from '../hooks/useUserSettings'
import { useDailyVocabularyProgress } from '../hooks/useDailyVocabularyProgress'
import { useDailyGrammarQuizPreview } from '../hooks/useDailyGrammarQuizPreview'
import { DailyVocabularyCard } from '../components/dashboard/DailyVocabularyCard'
import { ExamCountdownCard } from '../components/dashboard/ExamCountdownCard'
import { DailyGrammarQuizCard } from '../components/dashboard/DailyGrammarQuizCard'
import { PracticeMoreRow } from '../components/dashboard/PracticeMoreRow'
import '../components/dashboard/dashboard.css'

/**
 * / — the Dashboard (spec section 6, Stitch `dashboard` screen). The
 * "current studying level" driving the vocabulary/grammar cards is the
 * user's exam target level (settings.targetLevel), falling back to N5
 * until they set one via Settings/JLPT Level Selection (task #48).
 *
 * Phase 5 spec section 17: the JLPT goal is the FIRST major content
 * section on the Dashboard, ahead of Daily Vocabulary/Grammar — so
 * ExamCountdownCard (which already doubles as the "set your goal" prompt
 * when no target is set yet, reusing the existing /levels page rather
 * than any new goal-setting UI) renders as its own full-width section
 * right after the welcome greeting, before the vocab/grammar grid.
 * Deliberately kept to a handful of cards, not a statistics screen.
 */
export function Dashboard() {
  const { settings } = useUserSettings()
  const level = isJLPTLevel(settings?.targetLevel) ? settings.targetLevel : 'N5'
  const dailyGoal = settings?.dailyGoal ?? 50

  const { data: vocabCount, loading: vocabLoading } = useDailyVocabularyProgress()
  const { data: grammarPreview, loading: grammarLoading } = useDailyGrammarQuizPreview(level)

  return (
    <section className="dashboard-page">
      <div className="dashboard-welcome">
        <p className="text-body-lg">こんにちわ</p>
        <h1 className="text-display-lg">Ready to study?</h1>
      </div>

      <ExamCountdownCard targetLevel={settings?.targetLevel ?? null} examDate={settings?.examDate ?? null} />

      <div className="dashboard-grid">
        {vocabLoading ? (
          <p>Loading…</p>
        ) : (
          <DailyVocabularyCard count={vocabCount ?? 0} goal={dailyGoal} level={level} />
        )}

        {!grammarLoading && grammarPreview && (
          <DailyGrammarQuizCard level={level} session={grammarPreview.session} previewQuestion={grammarPreview.previewQuestion} />
        )}
      </div>

      <PracticeMoreRow level={level} />
    </section>
  )
}
