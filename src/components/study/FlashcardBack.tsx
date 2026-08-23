export interface FlashcardField {
  label: string
  value: string
  /** Render in the Japanese font/size (for vocab/reading-style fields). */
  japanese?: boolean
}

/**
 * After the flip: a generic list of label/value fields (spec section 6/7)
 * rather than hard-coded Vocab/Reading/Meaning/Part-of-Speech props —
 * this is what lets a future vocabulary field (e.g. an example sentence)
 * show up here just by adding another entry to the `fields` array the
 * caller builds, with no change to this component or the flip mechanics.
 */
export function FlashcardBack({ fields }: { fields: FlashcardField[] }) {
  return (
    <div className="study-flashcard__back-fields">
      {fields.map((field) => (
        <div className="study-flashcard__field" key={field.label}>
          <span className="study-flashcard__field-label">{field.label}</span>
          <span
            className={
              'study-flashcard__field-value' + (field.japanese ? ' study-flashcard__field-value--japanese' : '')
            }
            lang={field.japanese ? 'ja' : undefined}
          >
            {field.value}
          </span>
        </div>
      ))}
    </div>
  )
}
