import type { JLPTLevel } from '../types/jlpt'
import type { GrammarEntry } from '../types/grammar'
import type { GrammarQuestion } from '../types/question'

import grammarN5 from './grammar/n5.json'
import grammarN4 from './grammar/n4.json'
import grammarN3 from './grammar/n3.json'
import grammarN2 from './grammar/n2.json'

import questionsN5 from './questions/n5.json'
import questionsN4 from './questions/n4.json'
import questionsN3 from './questions/n3.json'
import questionsN2 from './questions/n2.json'

/**
 * Static content is bundled and imported directly (rather than fetched at
 * runtime) so it works identically offline and online, with no loading
 * state or network failure mode to handle — appropriate for content this
 * size. If the grammar/question banks grow large enough that initial
 * bundle size matters, each map entry below can be swapped for a
 * `() => import('./grammar/n5.json')` dynamic import without touching
 * any calling code, since callers only see the functions further down.
 */
const GRAMMAR_BY_LEVEL: Record<JLPTLevel, GrammarEntry[]> = {
  N5: grammarN5 as GrammarEntry[],
  N4: grammarN4 as GrammarEntry[],
  N3: grammarN3 as GrammarEntry[],
  N2: grammarN2 as GrammarEntry[],
}

const QUESTIONS_BY_LEVEL: Record<JLPTLevel, GrammarQuestion[]> = {
  N5: questionsN5 as GrammarQuestion[],
  N4: questionsN4 as GrammarQuestion[],
  N3: questionsN3 as GrammarQuestion[],
  N2: questionsN2 as GrammarQuestion[],
}

export function getGrammarForLevel(level: JLPTLevel): GrammarEntry[] {
  return GRAMMAR_BY_LEVEL[level]
}

export function getGrammarEntryById(id: string): GrammarEntry | undefined {
  for (const level of Object.keys(GRAMMAR_BY_LEVEL) as JLPTLevel[]) {
    const found = GRAMMAR_BY_LEVEL[level].find((entry) => entry.id === id)
    if (found) return found
  }
  return undefined
}

export function getQuestionsForLevel(level: JLPTLevel): GrammarQuestion[] {
  return QUESTIONS_BY_LEVEL[level]
}

export function getQuestionById(id: string): GrammarQuestion | undefined {
  for (const level of Object.keys(QUESTIONS_BY_LEVEL) as JLPTLevel[]) {
    const found = QUESTIONS_BY_LEVEL[level].find((question) => question.id === id)
    if (found) return found
  }
  return undefined
}

/** Resolves a question's linked grammar explanation, if any. Powers the
 * "jump from a wrong quiz answer to the relevant grammar note" flow. */
export function getGrammarEntryForQuestion(question: GrammarQuestion): GrammarEntry | undefined {
  return getGrammarEntryById(question.grammarPointId)
}
