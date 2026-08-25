/**
 * Before the flip: reading + vocab, matching the Stitch flashcard front.
 * The reading is the primary/largest element (the thing being studied
 * front-of-mind) with the original vocab kept visible underneath as
 * smaller, supporting context — sizing lives entirely in study.css now
 * (`.study-flashcard__reading`/`__vocab`), not in a shared text-* utility
 * class, so the two can scale independently of the rest of the type scale.
 */
export function FlashcardFront({ vocab, reading }: { vocab: string; reading: string }) {
  return (
    <>
      <div className="study-flashcard__reading" lang="ja">
        {reading}
      </div>
      <div className="study-flashcard__vocab" lang="ja">
        {vocab}
      </div>
      <div className="study-flashcard__hint">Tap to reveal the answer</div>
    </>
  )
}
