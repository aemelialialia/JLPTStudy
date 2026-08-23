import { JLPT_LEVELS } from '../../types/jlpt'
import type { JLPTLevel } from '../../types/jlpt'
import './vocabulary.css'

/**
 * Purely presentational — receives the current level and an onChange
 * callback, has no idea what the level controls. This is the seam the
 * future Stitch UI's own level picker replaces without touching any
 * vocabulary logic.
 */
export function LevelSelector({ value, onChange }: { value: JLPTLevel; onChange: (level: JLPTLevel) => void }) {
  return (
    <div className="vocab-field">
      <label htmlFor="level-selector">Level</label>
      <select id="level-selector" value={value} onChange={(e) => onChange(e.target.value as JLPTLevel)}>
        {JLPT_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
    </div>
  )
}
