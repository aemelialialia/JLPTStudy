import type { VocabularyItem } from '../../types/vocabulary'
import { FlashcardFront } from './FlashcardFront'
import { FlashcardBack, type FlashcardField } from './FlashcardBack'
import './study.css'

function backFieldsFor(word: VocabularyItem): FlashcardField[] {
  // A plain array built from the current VocabularyItem — adding a future
  // field (e.g. an example sentence) to the model is just adding a line
  // here; FlashcardBack itself never needs to change. Reading leads as
  // the largest, primary element (mirroring the front of the card), the
  // original vocab repeats right below it as smaller supporting context,
  // and meaning/part of speech follow as supporting information — the
  // same reading > vocab > meaning/part-of-speech hierarchy as the front.
  return [
    { label: 'Reading', value: word.reading, japanese: true, variant: 'reading' },
    { label: 'Vocab', value: word.vocab, japanese: true, hideLabel: true },
    { label: 'Meaning', value: word.meaning, hideLabel: true },
    { label: 'Part of Speech', value: word.partOfSpeech, variant: 'badge' },
  ]
}

/**
 * The flashcard itself (spec sections 6/7/22): a real 3D flip, not a
 * conditional swap — front and back are both always in the DOM, layered
 * with `backface-visibility: hidden`, and `study-flashcard--flipped`
 * rotates the shared inner wrapper 180deg (matching the Stitch
 * `vocabulary_study` screen's flip animation). Flip state is owned by the
 * parent (the study session view), not this component, because the
 * parent also needs to know whether the card is flipped to decide
 * whether to show the Correct/Incorrect controls at all (spec section 8:
 * don't let the user answer before seeing the answer).
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
    <div
      className={'study-flashcard squish-btn' + (flipped ? ' study-flashcard--flipped' : '')}
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
      <div className="study-flashcard__inner">
        {/* Both faces are always mounted for the 3D flip (backface-visibility
            hides the rotated-away one visually), but that alone leaves the
            answer readable in the accessibility tree before the user flips
            — aria-hidden on whichever face isn't showing keeps screen
            readers from spoiling it early. */}
        <div className="study-flashcard__face study-flashcard__face--front pattern-asanoha" aria-hidden={flipped}>
          <FlashcardFront vocab={word.vocab} reading={word.reading} />
        </div>
        <div className="study-flashcard__face study-flashcard__face--back" aria-hidden={!flipped}>
          <FlashcardBack fields={backFieldsFor(word)} />
        </div>
      </div>
    </div>
  )
}
