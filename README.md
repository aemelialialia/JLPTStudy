# JLPT Study

A personal, local-first Japanese JLPT (N5–N2) study tool. Static site, no
backend, no account — all study data lives in your browser's IndexedDB.
Deployable for free on GitHub Pages.

This is the **technical foundation** step: routing, data layer, content
layer, and design tokens are in place, but the real Stitch-designed UI has
not been implemented yet. Placeholder pages exist only to verify the
foundation works end to end.

## Stack

- **Vite + React + TypeScript** — static build output, fast dev server, no server runtime required.
- **react-router-dom (`HashRouter`)** — hash-based routing (`/#/level/N3`) so deep links and refreshes work on GitHub Pages without server rewrite rules.
- **idb** — a small (~1KB) promise-based wrapper around the native IndexedDB API. Used only inside `src/data/`.
- **xlsx (SheetJS)** — client-side `.xlsx` parsing for vocabulary import; nothing is ever uploaded anywhere.
- **vitest + fake-indexeddb + @testing-library/react** — dev-only; lets the whole data/service layer be tested headlessly (see "Verification" below).

No state management library, CSS framework, or backend framework was added — see the final response in the project chat for the full rationale.

## Project structure

```
src/
  types/          Domain models (VocabularyItem, StudyState, GrammarEntry, GrammarQuestion, Quiz, Settings)
  content/         Curated static content (grammar + questions), bundled JSON, per JLPT level. Read-only.
  data/            IndexedDB layer: db.ts (schema) + repositories/ (all reads/writes)
  services/        Framework-agnostic business logic (XLSX import, vocab learning, quiz, export/import)
  hooks/           Thin React bindings from services/repositories to components
  theme/           Design tokens (tokens.css + tokens.ts) — not final visual identity
  components/      Presentational components (layout shell, nav, generic StatCard)
  pages/           Placeholder routed pages (Dashboard, LevelPage, MistakeBook, Settings)
  App.tsx          Route table
  main.tsx         Entry point
```

## Scripts

```
npm run dev          # local dev server
npm run build         # production static build -> dist/
npm run preview       # preview the production build locally
npm run test          # run the automated test suite once
npm run test:watch    # watch mode
npm run typecheck     # tsc --noEmit
npm run lint           # oxlint
```

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages
automatically on push to `main`, via `actions/upload-pages-artifact` +
`actions/deploy-pages` (enable Pages → "GitHub Actions" as the source in
the repo settings once this is pushed). `vite.config.ts` uses `base: './'`
(relative), so the same build works whether Pages serves it from the repo
root or a `/repo-name/` subpath — no repo name is hard-coded anywhere.

## Data & content

- **IndexedDB** (`src/data/`) holds everything the user generates: imported vocabulary, memorization/study state, quiz attempts, mistakes, settings.
- **`src/content/`** holds curated, bundled JSON (grammar notes + grammar questions), organized per level. It ships empty in this step — see `src/content/README.md` for the schema and how to add real content later.

## Known accepted risk

`xlsx` (SheetJS) is pulled from the public npm registry rather than
SheetJS's own CDN (blocked by this environment's network policy), and npm's
listing carries known ReDoS/prototype-pollution advisories with no npm fix
yet available. Since this app only ever parses a file the user picks
themselves, entirely client-side, with no server and no untrusted network
input, the exposure is minimal. If a patched npm release lands later, bump
the version; otherwise consider installing directly from
`https://cdn.sheetjs.com` from a network that allows it.
