import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useGrammarLesson } from '../hooks/useGrammarLesson'
import { GrammarLessonSlideView } from '../components/grammar/GrammarLessonSlideView'
import '../components/grammar/grammar.css'

/**
 * /grammar/lesson/:grammarPointId — the slide-based lesson viewer (spec
 * sections 5-6). Supports `?slide=` to deep-link into an exact slide
 * (used when a grammar quiz question's lessonSlideId points here) and
 * `?returnLevel=`/`?returnMode=` to surface an explicit "Return to Quiz"
 * action when opened from the "Review this grammar" quiz reference
 * (spec sections 10-12) — the quiz session itself is untouched by this
 * navigation, so returning lands back on the same question/progress.
 */
export function GrammarLessonPage() {
  const { grammarPointId = '' } = useParams<{ grammarPointId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialSlideId = searchParams.get('slide') ?? undefined
  const returnLevel = searchParams.get('returnLevel')
  const returnMode = searchParams.get('returnMode')
  const hasReturnTarget = Boolean(returnLevel && returnMode)

  const { entry, slides, currentIndex, currentSlide, isFirst, isLast, goNext, goPrev } = useGrammarLesson(
    grammarPointId,
    initialSlideId,
  )

  if (!entry || !currentSlide) {
    return (
      <section>
        <h1>Grammar point not found</h1>
        <p>This grammar point may have been removed or renamed.</p>
        <Link to="/grammar">Back to Grammar</Link>
      </section>
    )
  }

  const exitTo = `/grammar/${entry.level}`

  return (
    <section className="grammar-lesson">
      <div className="grammar-lesson__header">
        <button
          type="button"
          className="grammar-lesson__exit squish-btn"
          onClick={() => navigate(exitTo)}
          aria-label="Exit lesson"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <span className="text-headline-lg-mobile" style={{ color: 'var(--color-primary)' }}>
          Michi
        </span>
        {hasReturnTarget ? (
          <Link
            to={`/grammar/${returnLevel}/quiz/${returnMode}`}
            className="grammar-lesson__nav-btn grammar-lesson__nav-btn--primary squish-btn"
            style={{ minHeight: 40, padding: '8px 16px' }}
          >
            Return to Quiz
          </Link>
        ) : (
          <span style={{ width: 44 }} aria-hidden="true" />
        )}
      </div>

      <div className="grammar-lesson__progress" role="img" aria-label={`Slide ${currentIndex + 1} of ${slides.length}`}>
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={
              'grammar-lesson__dot' +
              (i < currentIndex ? ' grammar-lesson__dot--complete' : i === currentIndex ? ' grammar-lesson__dot--current' : '')
            }
          />
        ))}
      </div>

      <div className="grammar-lesson__card">
        <GrammarLessonSlideView entry={entry} slide={currentSlide} />
      </div>

      <div className="grammar-lesson__nav">
        <button type="button" className="grammar-lesson__nav-btn squish-btn" onClick={goPrev} disabled={isFirst}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back
        </button>
        {isLast ? (
          <button
            type="button"
            className="grammar-lesson__nav-btn grammar-lesson__nav-btn--primary squish-btn"
            onClick={() => navigate(hasReturnTarget ? `/grammar/${returnLevel}/quiz/${returnMode}` : exitTo)}
          >
            {hasReturnTarget ? 'Return to Quiz' : 'Done'}
            <span className="material-symbols-outlined">check</span>
          </button>
        ) : (
          <button type="button" className="grammar-lesson__nav-btn grammar-lesson__nav-btn--primary squish-btn" onClick={goNext}>
            Next
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        )}
      </div>
    </section>
  )
}
