/**
 * Deterministic, dependency-free string hash (FNV-1a, 32-bit), rendered
 * as 8 lowercase hex characters. Used to build stable content-derived ids
 * (e.g. imported grammar points, see grammarXlsxImportService) without
 * needing a Latin-script slug of what may be Japanese text — the same
 * input always produces the same id, which is exactly what makes
 * re-importing the same spreadsheet update existing entries instead of
 * duplicating them.
 */
export function stableHash(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
