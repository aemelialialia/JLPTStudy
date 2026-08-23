/**
 * Shared JLPT level type used across vocabulary, grammar, questions,
 * and study-state models. A single union type (rather than four parallel
 * per-level implementations) is what lets vocabulary/grammar/quiz code
 * stay level-agnostic and reusable, per the project's architecture goals.
 */
export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2'

export const JLPT_LEVELS: readonly JLPTLevel[] = ['N5', 'N4', 'N3', 'N2']

export function isJLPTLevel(value: unknown): value is JLPTLevel {
  return typeof value === 'string' && (JLPT_LEVELS as readonly string[]).includes(value)
}
