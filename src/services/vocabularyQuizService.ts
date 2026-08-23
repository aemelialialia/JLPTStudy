import type { JLPTLevel } from '../types/jlpt'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { vocabularyLearningService } from './vocabularyLearningService'
import { shuffled } from '../utils/shuffle'

const CHOICE_COUNT = 4

export interface VocabQuizQuestion {
  vocabularyId: string
  vocab: string
  reading: string
  choices: string[]
  correctAnswer: string
}

/**
 * Auto-generates multiple-choice vocabulary questions from a level's
 * imported words (spec section 2: "vocabulary quizzes") — unlike Grammar,
 * vocabulary has no separately-authored question bank, so a question is
 * just "show this word, ask for its meaning, with 3 distractor meanings
 * drawn from other imported words." Kept deliberately simple and
 * ephemeral (no persisted session — see useVocabularyQuiz) since the
 * spec's "preserve context across navigation" requirement is specific to
 * Grammar's quiz-to-lesson reference flow, not vocabulary.
 */
export const vocabularyQuizService = {
  /**
   * Builds up to `count` questions for a level, each about a distinct
   * word. Returns fewer than `count` if the level doesn't have enough
   * words to also supply distractors (at least 2 words are needed: one
   * to ask about, one to draw a distractor meaning from).
   */
  async buildQuizSet(level: JLPTLevel, count: number): Promise<VocabQuizQuestion[]> {
    const words = await vocabularyRepository.getByLevel(level)
    if (words.length < 2) return []

    const askedAbout = shuffled(words).slice(0, count)

    return askedAbout.map((word) => {
      const distractorPool = shuffled(words.filter((w) => w.id !== word.id && w.meaning !== word.meaning))
      const distractors = distractorPool.slice(0, CHOICE_COUNT - 1).map((w) => w.meaning)
      const choices = shuffled([word.meaning, ...distractors])
      return {
        vocabularyId: word.id,
        vocab: word.vocab,
        reading: word.reading,
        choices,
        correctAnswer: word.meaning,
      }
    })
  },

  /**
   * Records the answer against the SAME memorization pipeline flashcards
   * use (studyState's new -> learning -> memorized rule) rather than a
   * parallel quiz-only tracker — a vocabulary quiz answer is real study
   * signal, so it also feeds "Daily Vocabulary Progress" on the Dashboard
   * (derived from studyState.lastReviewed) for free.
   */
  async submitAnswer(question: VocabQuizQuestion, selectedAnswer: string): Promise<{ isCorrect: boolean }> {
    const isCorrect = selectedAnswer === question.correctAnswer
    await vocabularyLearningService.recordAnswer(question.vocabularyId, isCorrect)
    return { isCorrect }
  },
}
