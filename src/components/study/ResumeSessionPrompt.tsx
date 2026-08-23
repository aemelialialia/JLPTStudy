import type { StudySession } from '../../types/studySession'
import '../vocabulary/vocabulary.css'
import './study.css'

/**
 * "You have an unfinished session, Continue or Start New" (spec section
 * 17) — this is what makes an in-progress session survive a refresh,
 * an app switch, or the phone locking, instead of it being silently
 * discarded. Shown whenever studySessionService reports an active
 * session for the level; never shown automatically resuming without
 * asking.
 */
export function ResumeSessionPrompt({
  session,
  onContinue,
  onStartNew,
}: {
  session: StudySession
  onContinue: () => void
  onStartNew: () => void
}) {
  const total = session.vocabularyIds.length
  return (
    <div className="study-banner" role="status">
      <p>
        You have an unfinished {session.level} study session.
        <br />
        {session.currentIndex} / {total} completed
      </p>
      <div className="vocab-button-row" style={{ justifyContent: 'center' }}>
        <button type="button" className="vocab-button vocab-button--primary" onClick={onContinue}>
          Continue
        </button>
        <button type="button" className="vocab-button" onClick={onStartNew}>
          Start New Session
        </button>
      </div>
    </div>
  )
}
