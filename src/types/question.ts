import type { JLPTLevel } from './jlpt'

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

/**
 * Curated grammar multiple-choice question content. Like grammar notes,
 * questions are bundled JSON content (src/content/questions/*.json), not
 * user-imported data. `grammarPointId` links a question back to the
 * GrammarEntry it tests, so quiz results can later deep-link to the
 * relevant explanation.
 */
export interface GrammarQuestion {
  id: string
  level: JLPTLevel
  questionText: string
  /** Answer choices shown to the user. Must contain `correctAnswer` verbatim. */
  choices: string[]
  correctAnswer: string
  explanation: string
  /** Foreign key -> GrammarEntry.id */
  grammarPointId: string
  difficulty?: QuestionDifficulty
}
