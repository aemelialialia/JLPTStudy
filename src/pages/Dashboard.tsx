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
 * until they set one via Settings/JLPT Level Selection (task #48) — the
 * countdown card itself doubles as that prompt when no target is set.
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
        <p className="text-body-lg">Konnichiwa!</p>
        <h1 className="text-display-lg">Ready to study?</h1>
      </div>

      <div className="dashboard-grid">
        {vocabLoading ? (
          <p>Loading…</p>
        ) : (
          <DailyVocabularyCard count={vocabCount ?? 0} goal={dailyGoal} level={level} />
        )}

        <div className="dashboard-side-stack">
          <ExamCountdownCard targetLevel={settings?.targetLevel ?? null} examDate={settings?.examDate ?? null} />
          {!grammarLoading && grammarPreview && (
            <DailyGrammarQuizCard level={level} session={grammarPreview.session} previewQuestion={grammarPreview.previewQuestion} />
          )}
        </div>
      </div>

      <PracticeMoreRow level={level} />
    </section>
  )
}
