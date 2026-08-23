import { useParams } from 'react-router-dom'
import { isJLPTLevel } from '../types/jlpt'
import { useVocabularyStudy } from '../hooks/useVocabularyStudy'
import type { SessionSize } from '../services/studySessionService'
import { EmptyVocabularyState } from '../components/study/EmptyVocabularyState'
import { LevelCompleteBanner } from '../components/study/LevelCompleteBanner'
import { ResumeSessionPrompt } from '../components/study/ResumeSessionPrompt'
import { StudySetup } from '../components/study/StudySetup'
import { StudySessionView } from '../components/study/StudySessionView'
import { SessionSummary } from '../components/study/SessionSummary'
import '../components/vocabulary/vocabulary.css'
import '../components/study/study.css'

/**
 * /study/:level — the whole Phase 3 flashcard workflow for one level,
 * driven entirely by useVocabularyStudy's phase state machine. This page
 * only picks which barebone component to render for the current phase;
 * every piece of business logic (selection, scoring, persistence,
 * completion detection) lives beneath it in studySessionService. This is
 * the disposable temporary UI (spec "IMPORTANT UI REQUIREMENT") — the
 * Stitch design later replaces this file and everything under
 * src/components/study/ without touching the hook or service layer.
 */
export function StudyPage() {
  const { level: levelParam } = useParams<{ level: string }>()
  const isValidLevel = isJLPTLevel(levelParam)
  // Hooks must run unconditionally; fall back to N5 purely to satisfy the
  // type when the param is invalid — never actually rendered in that case.
  const level = isValidLevel ? levelParam : 'N5'

  const { state, resume, beginSession, answer, reviewIncorrect, beginReviewCycle, backToSetup } =
    useVocabularyStudy(level)

  if (!isValidLevel) {
    return (
      <section>
        <h1>Unknown level</h1>
        <p>"{levelParam}" is not a recognized JLPT level (expected N5, N4, N3, or N2).</p>
      </section>
    )
  }

  return (
    <section className="study-screen">
      {state.phase === 'loading' && <p>Loading…</p>}

      {state.phase === 'no-vocabulary' && <EmptyVocabularyState level={level} />}

      {state.phase === 'level-complete' && (
        <LevelCompleteBanner level={level} onStartReviewCycle={beginReviewCycle} />
      )}

      {state.phase === 'resume-prompt' && (
        <>
          <h1>{level} Vocabulary</h1>
          <ResumeSessionPrompt
            session={state.session}
            onContinue={resume}
            onStartNew={() => beginSession(state.session.targetCount as SessionSize)}
          />
        </>
      )}

      {state.phase === 'setup' && <StudySetup progress={state.progress} onSelectAmount={beginSession} />}

      {state.phase === 'active' &&
        (state.card ? (
          <StudySessionView session={state.session} card={state.card} onAnswer={answer} />
        ) : (
          <p>Loading next word…</p>
        ))}

      {state.phase === 'complete' && (
        <SessionSummary
          session={state.session}
          progress={state.progress}
          onReviewIncorrect={reviewIncorrect}
          onBackToLevel={backToSetup}
        />
      )}

      {state.phase === 'error' && (
        <div className="study-banner" role="alert">
          <p>{state.message}</p>
          <button type="button" className="vocab-button" onClick={backToSetup}>
            Try again
          </button>
        </div>
      )}
    </section>
  )
}
