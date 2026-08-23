import type { StudySession } from '../../types/studySession'
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
      <div className="study-btn-row">
        <button type="button" className="study-btn study-btn--primary squish-btn" onClick={onContinue}>
          Continue
        </button>
        <button type="button" className="study-btn squish-btn" onClick={onStartNew}>
          Start New Session
        </button>
      </div>
    </div>
  )
}
