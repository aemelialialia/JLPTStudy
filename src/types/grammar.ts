import type { JLPTLevel } from './jlpt'

/** A single usage example attached to a grammar point. */
export interface GrammarExample {
  sentence: string
  meaning: string
}

/**
 * Curated grammar content. Unlike vocabulary, grammar notes are NOT
 * user-imported — they are structured content files bundled with the
 * app (see src/content/grammar/*.json) and loaded read-only at runtime.
 * This type is the schema for those JSON files.
 */
export interface GrammarEntry {
  id: string
  level: JLPTLevel
  grammarPoint: string
  meaning: string
  formation: string
  usage: string
  examples: GrammarExample[]
  notes?: string
  commonMistakes?: string
  /** IDs of other GrammarEntry records this point is commonly confused with or builds on. */
  relatedGrammar: string[]
}
