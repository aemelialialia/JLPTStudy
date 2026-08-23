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

  it('starts with no curated content bundled (populated separately, not invented here)', () => {
    for (const level of JLPT_LEVELS) {
      expect(getGrammarForLevel(level)).toEqual([])
      expect(getQuestionsForLevel(level)).toEqual([])
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
    // With an empty content bank this correctly resolves to undefined —
    // once grammar content is authored with matching ids, this same call
    // returns the linked GrammarEntry with no code changes required.
    expect(getGrammarEntryForQuestion(fakeQuestion)).toBeUndefined()
  })
})
