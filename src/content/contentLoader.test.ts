import { describe, it, expect } from 'vitest'
import { JLPT_LEVELS } from '../types/jlpt'
import {
  getGrammarForLevel,
  getQuestionsForLevel,
  getGrammarEntryById,
  getGrammarEntryForQuestion,
} from './contentLoader'

describe('contentLoader', () => {
  it('loads a grammar and question array for every JLPT level without throwing', () => {
    for (const level of JLPT_LEVELS) {
      expect(Array.isArray(getGrammarForLevel(level))).toBe(true)
      expect(Array.isArray(getQuestionsForLevel(level))).toBe(true)
    }
  })

  it('has curated grammar points and questions bundled for every level (Phase 4 content)', () => {
    for (const level of JLPT_LEVELS) {
      expect(getGrammarForLevel(level).length).toBeGreaterThan(0)
      expect(getQuestionsForLevel(level).length).toBeGreaterThan(0)
      for (const entry of getGrammarForLevel(level)) expect(entry.level).toBe(level)
      for (const question of getQuestionsForLevel(level)) expect(question.level).toBe(level)
    }
  })

  it('looks up grammar by id across all levels, returning undefined when absent', () => {
    expect(getGrammarEntryById('does-not-exist')).toBeUndefined()
  })

  it('resolves a question back to its grammar entry via grammarPointId', () => {
    const fakeQuestion = {
      id: 'q1',
      level: 'N5' as const,
      questionText: '...',
      choices: ['a', 'b'],
      correctAnswer: 'a',
      explanation: '...',
      grammarPointId: 'not-yet-authored',
    }
    // A question referencing an id that doesn't exist in the content bank
    // correctly resolves to undefined rather than throwing.
    expect(getGrammarEntryForQuestion(fakeQuestion)).toBeUndefined()

    // Real bundled questions, though, resolve to their actual grammar entry.
    const realQuestion = getQuestionsForLevel('N5')[0]
    expect(getGrammarEntryForQuestion(realQuestion)?.id).toBe(realQuestion.grammarPointId)
  })
})
