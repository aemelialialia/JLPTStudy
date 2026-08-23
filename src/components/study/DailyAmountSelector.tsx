import type { SessionSize } from '../../services/studySessionService'
import './study.css'

const AMOUNTS: SessionSize[] = [10, 15, 20]

/** "How many words today?" (spec section 3). Pure presentation — the chosen count is just forwarded up. */
export function DailyAmountSelector({ onSelect }: { onSelect: (count: SessionSize) => void }) {
  return (
    <div>
      <p>How many words today?</p>
      <div className="study-amount-row">
        {AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            className="study-amount-button"
            onClick={() => onSelect(amount)}
          >
            {amount}
          </button>
        ))}
      </div>
    </div>
  )
}
