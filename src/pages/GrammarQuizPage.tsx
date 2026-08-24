import { Link, useParams } from 'react-router-dom'
import { isJLPTLevel } from '../types/jlpt'
import { useGrammarQuiz, PRACTICE_DEFAULT_COUNT } from '../hooks/useGrammarQuiz'
import type { GrammarQuizMode } from '../hooks/useGrammarQuiz'
import { DAILY_QUESTION_COUNT } from '../services/grammarQuizSessionService'
import { useMistakes } from '../hooks/useMistakes'
import { GrammarQuizOption } from '../components/grammar/GrammarQuizOption'
import type { GrammarQuizOptionStatus } from '../components/grammar/GrammarQuizOption'
import { GrammarQuizFeedback } from '../components/grammar/GrammarQuizFeedback'
import { GrammarQuizSummary } from '../components/grammar/GrammarQuizSummary'
import '../components/grammar/grammar.css'

function isGrammarQuizMode(value: unknown): value is GrammarQuizMode {
  return value === 'daily' || value === 'practice' || value === 'mistakes'
}

function quizTitle(mode: GrammarQuizMode): string {
  if (mode === 'daily') return 'Daily Grammar Quiz'
  if (mode === 'mistakes') return 'Mistake Practice'
  return 'Grammar Quiz'
}

/**
 * Renders a GrammarQuestion's `questionText`, replacing the authored
 * fullwidth-underscore blank marker (＿＿＿) with a styled blank — filled
 * in with the user's answer, colored by correctness, once answered.
 * Falls back to plain text for any question without a blank marker.
 */
function QuestionText({
  questionText,
  blankValue,
  blankStatus,
}: {
  questionText: string
  blankValue?: string
  blankStatus?: 'correct' | 'incorrect'
}) {
  const parts = questionText.split(/＿+/)
  if (parts.length === 1) return <>{questionText}</>

  const blankStyle =
    blankStatus === 'correct'
      ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)', fontWeight: 700 }
      : blankStatus === 'incorrect'
        ? { borderColor: 'var(--color-error)', color: 'var(--color-error)', fontWeight: 700 }
        : undefined

  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="grammar-quiz__blank" style={blankStyle}>
              {blankValue ?? '＿＿＿'}
            </span>
          )}
        </span>
      ))}
    </>
  )
}

/**
 * /grammar/:level/quiz/:mode — multiple-choice grammar quiz, practice or
 * Daily Grammar Quiz (spec sections 7-9). All state comes from
 * useGrammarQuiz's persisted-session state machine, which is what makes
 * "Review this grammar -> return here" restore the exact same question
 * and progress (spec sections 10-12) for free.
 */
export function GrammarQuizPage() {
  const { level: levelParam, mode: modeParam } = useParams<{ level: string; mode: string }>()
  const isValidLevel = isJLPTLevel(levelParam)
  const isValidMode = isGrammarQuizMode(modeParam)
  const level = isValidLevel ? levelParam : 'N5'
  const mode = isValidMode ? modeParam : 'practice'

  const { state, start, answer, continueToNext } = useGrammarQuiz(level, mode)
  // Only needed for the mistake-practice "ready" screen's question count
  // (the exact pool size isn't known until start() builds the session) —
  // harmless to fetch unconditionally since useMistakes is cheap and
  // already used elsewhere (Mistake Book) for the same data.
  const { data: mistakesForLevel } = useMistakes(level)
  const activeMistakeCount = (mistakesForLevel ?? []).filter((m) => !m.mastered).length

  if (!isValidLevel || !isValidMode) {
    return (
      <section>
        <h1>Quiz not found</h1>
        <p>That grammar quiz link isn&apos;t valid.</p>
        <Link to="/grammar">Back to Grammar</Link>
      </section>
    )
  }

  let reviewHref = ''
  if (state.phase === 'feedback') {
    const params = new URLSearchParams({ returnLevel: level, returnMode: mode })
    if (state.question.lessonSlideId) params.set('slide', state.question.lessonSlideId)
    reviewHref = `/grammar/lesson/${state.result.grammarPointId}?${params.toString()}`
  }

  return (
    <section className="grammar-quiz">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to={`/grammar/${level}`} aria-label="Close quiz" className="grammar-lesson__exit squish-btn">
          <span className="material-symbols-outlined">close</span>
        </Link>
        <h1 className="text-headline-lg-mobile" style={{ color: 'var(--color-primary)', margin: 0 }}>
          {quizTitle(mode)}
        </h1>
        <span style={{ width: 44 }} aria-hidden="true" />
      </div>

      {state.phase === 'loading' && <p>Loading…</p>}

      {state.phase === 'no-questions' && (
        <div className="grammar-quiz__summary">
          <p>No {level} grammar questions are available yet.</p>
          <Link to={`/grammar/${level}`} className="grammar-quiz__continue squish-btn">
            Back to Grammar
          </Link>
        </div>
      )}

      {state.phase === 'ready' && (
        <div className="grammar-quiz__summary">
          <span className="material-symbols-outlined" data-fill="1" style={{ fontSize: 40, color: 'var(--color-primary)' }}>
            quiz
          </span>
          <h2 className="text-headline-lg">
            {mode === 'daily' ? "Today's Daily Grammar Quiz" : mode === 'mistakes' ? 'Practice Your Mistakes' : `${level} Practice Quiz`}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {level} /{' '}
            {mode === 'daily' ? DAILY_QUESTION_COUNT : mode === 'mistakes' ? activeMistakeCount : PRACTICE_DEFAULT_COUNT} Questions
          </p>
          <button
            type="button"
            className="grammar-quiz__continue squish-btn"
            onClick={() => void start()}
            disabled={mode === 'mistakes' && activeMistakeCount === 0}
          >
            Start Quiz
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          {mode === 'mistakes' && activeMistakeCount === 0 && (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              No active mistakes for {level} right now — nice work!
            </p>
          )}
        </div>
      )}

      {(state.phase === 'active' || state.phase === 'feedback') && (
        <>
          <div className="grammar-quiz__progress-bar">
            <span className="text-label-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {`Question ${state.session.currentIndex + 1} of ${state.session.questionIds.length}`}
            </span>
            <div className="grammar-quiz__progress-dots">
              {state.session.questionIds.map((id, i) => (
                <div
                  key={id}
                  className={
                    'grammar-quiz__progress-dot' +
                    (i < state.session.currentIndex
                      ? ' grammar-quiz__progress-dot--done'
                      : i === state.session.currentIndex
                        ? ' grammar-quiz__progress-dot--current'
                        : '')
                  }
                />
              ))}
            </div>
          </div>

          <div className="grammar-quiz__card pattern-asanoha">
            <span className="grammar-quiz__level-tag text-label-sm">{`JLPT ${state.question.level}`}</span>

            <div>
              <p className="text-body-md" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-1)' }}>
                Fill in the blank:
              </p>
              <h2 className="grammar-quiz__question text-title-md">
                <QuestionText
                  questionText={state.question.questionText}
                  blankValue={state.phase === 'feedback' ? state.selectedAnswer : undefined}
                  blankStatus={state.phase === 'feedback' ? (state.result.isCorrect ? 'correct' : 'incorrect') : undefined}
                />
              </h2>
            </div>

            {state.phase === 'feedback' && (
              <GrammarQuizFeedback
                isCorrect={state.result.isCorrect}
                explanation={state.result.explanation}
                mistakeRecorded={state.result.mistakeRecorded}
                mistakeMastered={state.result.mistakeMastered}
              />
            )}

            <div className="grammar-quiz__options">
              {state.question.choices.map((choice, i) => {
                const status: GrammarQuizOptionStatus =
                  state.phase !== 'feedback'
                    ? 'idle'
                    : choice === state.question.correctAnswer
                      ? 'correct'
                      : choice === state.selectedAnswer
                        ? 'incorrect'
                        : 'faded'
                return (
                  <GrammarQuizOption
                    key={choice}
                    index={i}
                    label={choice}
                    status={status}
                    disabled={state.phase === 'feedback'}
                    onClick={() => void answer(choice)}
                  />
                )
              })}
            </div>

            {state.phase === 'feedback' && (
              <div className="grammar-quiz__actions">
                <Link to={reviewHref} className="grammar-quiz__review-link squish-btn">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    menu_book
                  </span>
                  Review this grammar
                </Link>
                <button type="button" className="grammar-quiz__continue squish-btn" onClick={() => void continueToNext()}>
                  {state.session.currentIndex + 1 >= state.session.questionIds.length ? 'Finish' : 'Next Question'}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {state.phase === 'complete' && <GrammarQuizSummary session={state.session} level={level} />}

      {state.phase === 'error' && (
        <div className="grammar-quiz__summary" role="alert">
          <p>{state.message}</p>
          <Link to={`/grammar/${level}`} className="grammar-quiz__continue squish-btn">
            Back to Grammar
          </Link>
        </div>
      )}
    </section>
  )
}
