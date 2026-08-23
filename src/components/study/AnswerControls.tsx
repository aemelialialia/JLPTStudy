import './study.css'

/**
 * [ Incorrect ] [ Correct ] (spec section 8). The parent only renders
 * this once the card is flipped, so the user physically cannot answer
 * before seeing the reading/meaning/part of speech — not communicated by
 * color alone, the controls simply aren't there yet.
 */
export function AnswerControls({
  onIncorrect,
  onCorrect,
}: {
  onIncorrect: () => void
  onCorrect: () => void
}) {
  return (
    <div className="study-answer-row">
      <button type="button" className="study-answer-button study-answer-button--incorrect" onClick={onIncorrect}>
        Incorrect
      </button>
      <button type="button" className="study-answer-button study-answer-button--correct" onClick={onCorrect}>
        Correct
      </button>
    </div>
  )
}
