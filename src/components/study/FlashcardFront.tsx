/** Before the flip: reading + vocab (spec section 6/7), matching the Stitch flashcard front. */
export function FlashcardFront({ vocab, reading }: { vocab: string; reading: string }) {
  return (
    <>
      <div className="study-flashcard__reading text-title-md" lang="ja">
        {reading}
      </div>
      <div className="study-flashcard__vocab" lang="ja">
        {vocab}
      </div>
      <div className="study-flashcard__hint">Tap to reveal the answer</div>
    </>
  )
}
