import { Link, useParams } from 'react-router-dom'
import { isJLPTLevel } from '../types/jlpt'
import { useVocabularyQuiz } from '../hooks/useVocabularyQuiz'
import { GrammarQuizOption } from '../components/grammar/GrammarQuizOption'
import type { GrammarQuizOptionStatus } from '../components/grammar/GrammarQuizOption'
// Reuses the Grammar quiz's card/progress/option visual system (grammar.css's
// `.grammar-quiz__*` classes) rather than duplicating an identical set of
// rules under a new name — both quizzes share the same Stitch quiz-card
// language, and the Grammar-specific pieces (the review-a-lesson link)
// simply aren't used here.
import '../components/grammar/grammar.css'

/**
 * /study/:level/quiz — vocabulary multiple-choice quiz (spec section 2).
 * Questions are generated from the level's imported words
 * (useVocabularyQuiz/vocabularyQuizService); answers feed the same
 * memorization pipeline flashcards use, so quiz activity also counts
 * toward the Dashboard's Daily Vocabulary Progress.
 */
export function VocabQuizPage() {
  const { level: levelParam } = useParams<{ level: string }>()
  const isValidLevel = isJLPTLevel(levelParam)
  const level = isValidLevel ? levelParam : 'N5'

  const { state, totalQuestions, answers, start, answer, continueToNext } = useVocabularyQuiz(level)

  if (!isValidLevel) {
    return (
      <section>
        <h1>Unknown level</h1>
        <p>&quot;{levelParam}&quot; is not a recognized JLPT level (expected N5, N4, N3, or N2).</p>
      </section>
    )
  }

  const correctCount = answers.filter((a) => a.isCorrect).length

  return (
    <section className="grammar-quiz">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to={`/study/${level}`} aria-label="Close quiz" className="grammar-lesson__exit squish-btn">
          <span className="material-symbols-outlined">close</span>
        </Link>
        <h1 className="text-headline-lg-mobile" style={{ color: 'var(--color-primary)', margin: 0 }}>
          Vocabulary Quiz
        </h1>
        <span style={{ width: 44 }} aria-hidden="true" />
      </div>

      {state.phase === 'loading' && <p>Loading…</p>}

      {state.phase === 'no-questions' && (
        <div className="grammar-quiz__summary">
          <p>Import at least two {level} words to take a vocabulary quiz.</p>
          <Link to={`/level/${level}`} className="grammar-quiz__continue squish-btn">
            Import Vocabulary
          </Link>
        </div>
      )}

      {state.phase === 'ready' && (
        <div className="grammar-quiz__summary">
          <span className="material-symbols-outlined" data-fill="1" style={{ fontSize: 40, color: 'var(--color-primary)' }}>
            quiz
          </span>
          <h2 className="text-headline-lg">{level} Vocabulary Quiz</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {level} / {state.count} Questions
          </p>
          <button type="button" className="grammar-quiz__continue squish-btn" onClick={start}>
            Start Quiz
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      )}

      {(state.phase === 'active' || state.phase === 'feedback') && (
        <>
          <div className="grammar-quiz__progress-bar">
            <span className="text-label-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {`Question ${state.index + 1} of ${totalQuestions}`}
            </span>
            <div className="grammar-quiz__progress-dots">
              {Array.from({ length: totalQuestions }, (_, i) => (
                <div
                  key={i}
                  className={
                    'grammar-quiz__progress-dot' +
                    (i < state.index ? ' grammar-quiz__progress-dot--done' : i === state.index ? ' grammar-quiz__progress-dot--current' : '')
                  }
                />
              ))}
            </div>
          </div>

          <div className="grammar-quiz__card pattern-asanoha">
            <span className="grammar-quiz__level-tag text-label-sm">{`JLPT ${level}`}</span>

            <div style={{ textAlign: 'center' }}>
              <p className="text-body-md" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
                What does this word mean?
              </p>
              <p className="text-title-md" style={{ color: 'var(--color-text-secondary)' }} lang="ja">
                {state.question.reading}
              </p>
              <h2 className="text-display-lg" style={{ color: 'var(--color-primary)', margin: 0 }} lang="ja">
                {state.question.vocab}
              </h2>
            </div>

            {state.phase === 'feedback' && (
              <div
                className={
                  'grammar-quiz__feedback' + (state.isCorrect ? ' grammar-quiz__feedback--correct' : ' grammar-quiz__feedback--incorrect')
                }
              >
                <div className="grammar-quiz__feedback-main">
                  <div
                    className={
                      'grammar-quiz__feedback-icon' +
                      (state.isCorrect ? ' grammar-quiz__feedback-icon--correct' : ' grammar-quiz__feedback-icon--incorrect')
                    }
                  >
                    <span className="material-symbols-outlined" data-fill="1">
                      {state.isCorrect ? 'check' : 'close'}
                    </span>
                  </div>
                  <h3 className="grammar-quiz__feedback-title text-title-md">
                    {state.isCorrect ? 'Correct!' : `Not quite — it means "${state.question.correctAnswer}"`}
                  </h3>
                </div>
              </div>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="grammar-quiz__continue squish-btn" onClick={continueToNext}>
                  {state.index + 1 >= totalQuestions ? 'Finish' : 'Next Question'}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {state.phase === 'complete' && (
        <div className="grammar-quiz__summary">
          <span className="material-symbols-outlined" data-fill="1" style={{ fontSize: 48, color: 'var(--color-primary)' }}>
            emoji_events
          </span>
          <h1 className="text-headline-lg">Quiz complete!</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {level} vocabulary — {correctCount} / {totalQuestions} correct
          </p>
          <div className="grammar-quiz__summary-stats">
            <span className="text-title-md" style={{ color: 'var(--color-primary)' }}>
              {totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}%
            </span>
          </div>
          <Link to={`/study/${level}`} className="grammar-quiz__continue squish-btn">
            Back to Vocabulary
          </Link>
        </div>
      )}

      {state.phase === 'error' && (
        <div className="grammar-quiz__summary" role="alert">
          <p>{state.message}</p>
          <Link to={`/study/${level}`} className="grammar-quiz__continue squish-btn">
            Back to Vocabulary
          </Link>
        </div>
      )}
    </section>
  )
}
