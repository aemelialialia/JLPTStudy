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
  /**
   * Optional foreign key -> GrammarSlide.id (see buildGrammarSlides in
   * types/grammar.ts) for the exact slide within the grammar point's
   * lesson that explains this question. When present, "Review this
   * grammar" opens the lesson at this precise slide instead of its
   * start (spec section 12: "never redirect the user to the generic
   * Grammar homepage").
   */
  lessonSlideId?: string
  difficulty?: QuestionDifficulty
}
