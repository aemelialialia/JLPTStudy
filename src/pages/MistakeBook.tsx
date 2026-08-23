import { useMistakes } from '../hooks/useMistakes'

/**
 * Placeholder Mistake Book page — verifies mistakes recorded in
 * IndexedDB are readable across levels. The real review UI (jumping
 * back to the linked grammar explanation, re-quizzing, etc.) is a later
 * step; this only proves the data is there.
 */
export function MistakeBook() {
  const { data: mistakes, loading } = useMistakes()

  return (
    <section>
      <h1>Mistake Book</h1>
      {loading && <p>Loading…</p>}
      {!loading && (!mistakes || mistakes.length === 0) && (
        <p>No mistakes recorded yet — they'll show up here after your first quiz.</p>
      )}
      {!loading && mistakes && mistakes.length > 0 && (
        <ul>
          {mistakes.map((m) => (
            <li key={m.id}>
              [{m.level}] question {m.questionId} — answered "{m.selectedAnswer}", correct was "
              {m.correctAnswer}" {m.mastered ? '(mastered)' : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
