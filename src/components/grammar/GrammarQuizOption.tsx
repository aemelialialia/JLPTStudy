export type GrammarQuizOptionStatus = 'idle' | 'correct' | 'incorrect' | 'faded'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

interface GrammarQuizOptionProps {
  index: number
  label: string
  status: GrammarQuizOptionStatus
  disabled: boolean
  onClick: () => void
}

/** One multiple-choice answer button (grammar_quiz_interaction_test prototype screen). */
export function GrammarQuizOption({ index, label, status, disabled, onClick }: GrammarQuizOptionProps) {
  const letter = LETTERS[index] ?? String(index + 1)
  const className =
    'grammar-quiz__option quiz-option-button squish-btn' +
    (status === 'correct' ? ' grammar-quiz__option--correct' : '') +
    (status === 'incorrect' ? ' grammar-quiz__option--incorrect' : '') +
    (status === 'faded' ? ' grammar-quiz__option--faded' : '')

  return (
    <button type="button" className={className} disabled={disabled} onClick={onClick}>
      <div className="grammar-quiz__option-row">
        <span className="text-body-md" style={{ fontWeight: 700 }}>{`${letter}. ${label}`}</span>
        {status === 'correct' && (
          <span className="material-symbols-outlined" data-fill="1" style={{ color: 'var(--color-primary)' }}>
            check_circle
          </span>
        )}
        {status === 'incorrect' && (
          <span className="material-symbols-outlined" style={{ color: 'var(--color-error)' }}>
            close
          </span>
        )}
      </div>
    </button>
  )
}
