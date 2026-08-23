/** Before the flip: primarily the vocab itself (spec section 6/7). */
export function FlashcardFront({ vocab }: { vocab: string }) {
  return (
    <>
      <div className="study-flashcard__vocab" lang="ja">
        {vocab}
      </div>
      <div className="study-flashcard__hint">Tap the card or Flip to reveal the answer</div>
    </>
  )
}
