import type { VocabularyItem } from '../../types/vocabulary'
import { FlashcardFront } from './FlashcardFront'
import { FlashcardBack, type FlashcardField } from './FlashcardBack'
import './study.css'

function backFieldsFor(word: VocabularyItem): FlashcardField[] {
  // A plain array built from the current VocabularyItem — adding a future
  // field (e.g. an example sentence) to the model is just adding a line
  // here; FlashcardBack itself never needs to change (spec section 7).
  return [
    { label: 'Vocab', value: word.vocab, japanese: true },
    { label: 'Reading', value: word.reading, japanese: true },
    { label: 'Meaning', value: word.meaning },
    { label: 'Part of Speech', value: word.partOfSpeech },
  ]
}

/**
 * The flashcard itself (spec section 6/7). Deliberately no 3D flip
 * animation — `flipped` just swaps which side renders. Flip state is
 * owned by the parent (the study session view), not this component,
 * because the parent also needs to know whether the card is flipped to
 * decide whether to show the Correct/Incorrect controls at all (spec
 * section 8: don't let the user answer before seeing the answer).
 */
export function Flashcard({
  word,
  flipped,
  onFlip,
}: {
  word: VocabularyItem
  flipped: boolean
  onFlip: () => void
}) {
  return (
    <div>
      <div
        className="study-flashcard"
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={flipped ? 'Flashcard, showing answer' : 'Flashcard, tap to reveal the answer'}
        onClick={() => {
          if (!flipped) onFlip()
        }}
        onKeyDown={(e) => {
          if (!flipped && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onFlip()
          }
        }}
      >
        {flipped ? <FlashcardBack fields={backFieldsFor(word)} /> : <FlashcardFront vocab={word.vocab} />}
      </div>
      {!flipped && (
        <button type="button" className="study-flip-button" onClick={onFlip}>
          Flip
        </button>
      )}
    </div>
  )
}
