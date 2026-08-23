import { useEffect, useMemo, useState } from 'react'
import { grammarLessonService } from '../services/grammarLessonService'

/**
 * Drives one grammar point's slide-based lesson (spec sections 5-6).
 * Slide content itself is synchronous (derived from bundled JSON, see
 * buildGrammarSlides), so the only async part is recording "studied"
 * progress — fired once per mount, which is exactly the "opened this
 * lesson" interaction spec section 15 wants tracked.
 */
export function useGrammarLesson(grammarPointId: string, initialSlideId?: string) {
  const entry = useMemo(() => grammarLessonService.getGrammarPoint(grammarPointId), [grammarPointId])
  const slides = useMemo(() => grammarLessonService.getSlides(grammarPointId), [grammarPointId])

  const initialIndex = useMemo(() => {
    if (!initialSlideId) return 0
    const idx = slides.findIndex((s) => s.id === initialSlideId)
    return idx === -1 ? 0 : idx
  }, [slides, initialSlideId])

  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    setCurrentIndex(initialIndex)
    // Re-sync only when the lesson identity or requested entry slide
    // actually changes — not on every slides/entry recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grammarPointId, initialSlideId])

  useEffect(() => {
    if (!entry) return
    void grammarLessonService.markStudied(entry.id)
  }, [entry])

  const currentSlide = slides[currentIndex]

  return {
    entry,
    slides,
    currentIndex,
    currentSlide,
    isFirst: currentIndex === 0,
    isLast: currentIndex === slides.length - 1,
    goNext: () => setCurrentIndex((i) => Math.min(i + 1, slides.length - 1)),
    goPrev: () => setCurrentIndex((i) => Math.max(i - 1, 0)),
    goTo: (index: number) => setCurrentIndex(Math.max(0, Math.min(index, slides.length - 1))),
  }
}
