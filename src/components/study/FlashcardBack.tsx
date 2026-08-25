export interface FlashcardField {
  label: string
  value: string
  /** Render in the Japanese font/size (for vocab/reading-style fields). */
  japanese?: boolean
  /**
   * 'badge' renders as a small pill (part of speech); 'headline' renders
   * large and prominent (kept for any future large-and-prominent, non-
   * Japanese field); 'reading' is the largest tier of all — the primary
   * information on the card (the full hiragana reading). Plain fields
   * render as a label + value pair unless `hideLabel` is set.
   */
  variant?: 'badge' | 'headline' | 'reading'
  /** Suppress the label caption even for a plain (non-badge/headline/reading) field — used for Vocab/Meaning so the back face reads as bare, hierarchy-led text rather than a labelled data sheet. */
  hideLabel?: boolean
}

/**
 * After the flip: a generic list of label/value fields (spec section 6/7)
 * rather than hard-coded Vocab/Reading/Meaning/Part-of-Speech props —
 * this is what lets a future vocabulary field (e.g. an example sentence)
 * show up here just by adding another entry to the `fields` array the
 * caller builds, with no change to this component or the flip mechanics.
 * The optional `variant` is purely a visual hint (Stitch shows the part
 * of speech as a small badge and the meaning as the large headline) — it
 * never changes what data is shown.
 */
export function FlashcardBack({ fields }: { fields: FlashcardField[] }) {
  return (
    <div className="study-flashcard__back-fields">
      {fields.map((field) => {
        if (field.variant === 'badge') {
          return (
            <span key={field.label} className="study-flashcard__field--pos text-label-sm">
              {field.value}
            </span>
          )
        }
        const showLabel = field.variant !== 'headline' && field.variant !== 'reading' && !field.hideLabel
        return (
          <div className="study-flashcard__field" key={field.label}>
            {showLabel && <span className="study-flashcard__field-label">{field.label}</span>}
            <span
              className={
                'study-flashcard__field-value' +
                (field.japanese ? ' study-flashcard__field-value--japanese' : '') +
                (field.variant === 'headline' ? ' study-flashcard__field-value--headline' : '') +
                (field.variant === 'reading' ? ' study-flashcard__field-value--reading' : '')
              }
              lang={field.japanese ? 'ja' : undefined}
            >
              {field.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
