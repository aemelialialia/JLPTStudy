/**
 * JS-side mirror of the values in tokens.css, for the rare cases where a
 * component needs a token as a plain number/string rather than a CSS
 * custom property (e.g. `matchMedia`, computing a layout in JS, or a
 * chart library that can't read CSS variables). Components should still
 * prefer CSS variables for styling — this file exists for logic, not
 * for style declarations.
 *
 * Keep these numbers in sync with tokens.css by hand; there are few
 * enough of them that a build-time generator would be overhead this
 * project doesn't need yet.
 */
export const breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const

export type Breakpoint = keyof typeof breakpoints

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const

export const touchTargetMin = 44 // px — iOS Human Interface Guidelines minimum tap target

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const
