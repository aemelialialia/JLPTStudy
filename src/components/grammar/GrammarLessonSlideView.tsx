import { Link } from 'react-router-dom'
import type { GrammarEntry, GrammarSlide } from '../../types/grammar'

/**
 * Renders the content of ONE lesson slide (grammar_lesson_slide_1
 * prototype screen). Slide types share one visual shell — badge, slide
 * label, grammar-point heading, content card, example list — and only
 * differ in which pieces they populate (spec section 5: slides can vary
 * in count/type, so this stays generic rather than one component per type).
 */
export function GrammarLessonSlideView({ entry, slide }: { entry: GrammarEntry; slide: GrammarSlide }) {
  return (
    <>
      <div className="grammar-lesson__badge text-label-sm">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
          book
        </span>
        <span>{`JLPT ${entry.level} Grammar`}</span>
      </div>

      <p className="grammar-lesson__slide-title text-label-sm">{slide.title}</p>
      <h1 className="grammar-lesson__point text-display-lg">{entry.grammarPoint}</h1>

      {slide.content && (
        <div className="grammar-lesson__body">
          <p className="text-body-lg">{slide.content}</p>
          {slide.notes && <p style={{ marginTop: 'var(--space-2)' }}>{slide.notes}</p>}
        </div>
      )}

      {slide.meta && slide.meta.length > 0 && (
        <dl className="grammar-lesson__meta">
          {slide.meta.map((item) => (
            <div key={item.label} className="grammar-lesson__meta-row">
              <dt className="text-label-sm">{item.label}</dt>
              <dd className="text-body-md">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {slide.examples.length > 0 && (
        <div className="grammar-lesson__examples">
          {slide.examples.map((example, i) => (
            <div key={i} className="grammar-lesson__example">
              <p className="grammar-lesson__example-jp">{example.sentence}</p>
              {example.reading && <p className="grammar-lesson__example-reading">{example.reading}</p>}
              <p className="grammar-lesson__example-meaning">{example.meaning}</p>
            </div>
          ))}
        </div>
      )}

      {slide.type === 'practice' && (
        <Link to={`/grammar/${entry.level}/quiz/practice`} className="grammar-lesson__practice-cta squish-btn">
          <span>Practice this level</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      )}
    </>
  )
}
