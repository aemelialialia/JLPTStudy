# JLPT Study

A personal, local-first Japanese JLPT (N5–N2) study tool. Static site, no
backend, no account — all study data lives in your browser's IndexedDB.
Deployable for free on GitHub Pages.

**Phase 1** built the technical foundation (routing, data layer, content
layer, design tokens). **Phase 2** added a real, working vocabulary import
and database system — XLSX import, IndexedDB storage, search/filter, and
study-state tracking. **Phase 3** (this step) adds the vocabulary study /
flashcard system on top of that same data: daily session setup, flip
flashcards, correct/incorrect grading, new → learning → memorized
progression, session persistence/resume, level completion, and review
cycles. Every screen across all three phases is deliberately barebone —
functional, not final. The real Stitch-designed UI has not been
implemented yet; these screens exist only to prove the underlying data
layer and study engine work end to end.

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
  types/           Domain models (VocabularyItem, StudyState, StudySession, vocabularyImport types, GrammarEntry, GrammarQuestion, Quiz, Settings)
  content/         Curated static content (grammar + questions), bundled JSON, per JLPT level. Read-only.
  data/            IndexedDB layer: db.ts (schema) + repositories/ (all reads/writes — the only files that touch IndexedDB, including studySessionRepository)
  services/        Framework-agnostic business logic (XLSX import/validation, vocab learning, studySessionService — the flashcard engine, quiz, export/import)
  hooks/           Thin React bindings from services/repositories to components (useVocabularyList, useVocabularyImport, useVocabularyDetail, useVocabularyStudy, ...)
  theme/           Design tokens (tokens.css + tokens.ts) — not final visual identity
  components/      Presentational components (layout shell, nav, generic StatCard, vocabulary/ — Phase 2's import/list/detail UI, study/ — Phase 3's flashcard/session UI)
  pages/           Routed pages (Dashboard, LevelPage — vocabulary manager, StudyIndexPage/StudyPage — the flashcard flow, MistakeBook, Settings)
  integration/     End-to-end tests that drive the real rendered UI through the full import/study workflows (vocabularyWorkflow.test.tsx, studyWorkflow.test.tsx)
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

## Vocabulary import

Vocabulary is imported from `.xlsx` files with exactly four required
columns (any column order, header matching is whitespace/case-insensitive):

| Column           | Meaning                                                              |
| ---------------- | --------------------------------------------------------------------- |
| `Vocab`          | The word as normally written — kanji included where applicable. Single field; never split into separate kanji/kana fields. |
| `Reading`        | The complete hiragana reading, used exactly as supplied. Never generated, inferred, or modified beyond trimming whitespace. |
| `Meaning`        | English meaning/definition.                                          |
| `Part of Speech` | e.g. Noun, Verb, い-adjective, な-adjective, Particle, ...             |

No other columns are required or read. A missing required column fails
fast with a clear error naming it; unrelated column names are never
fuzzy-matched to a required one.

**Flow:** pick a file → pick a JLPT level → the file is parsed and
validated entirely in the browser (it is never uploaded anywhere) → a
preview shows level, filename, row counts (valid/invalid/duplicate-in-file/
new/existing), and a sample table → nothing is written to IndexedDB until
you click Confirm.

**Validation:** blank rows are silently skipped (not errors). A row
missing a required field is reported by row number and the specific
missing field(s) (e.g. `Row 3: Missing Reading, Missing Part of Speech`)
and excluded from the import — one bad row never aborts the rest.

**Duplicates & re-import:** a vocabulary item's identity is `level + Vocab
+ Reading` — never meaning alone, since two different words can share an
English gloss. Re-importing a word that already exists updates its content
fields (if changed) but always preserves its database id, study state, and
full review history; memorization progress is never reset by a re-import.

**Atomicity:** each import commits through a single IndexedDB
read-write transaction across the vocabulary and study-state stores. A
failure partway through aborts and rolls back the whole transaction rather
than leaving a partial write — verified with dedicated tests that force a
mid-import failure and assert the database is unchanged afterward.

## Vocabulary study (flashcards)

The Study screens (`/#/study`, `/#/study/:level`) turn the Phase 2
vocabulary database into a daily flashcard workflow. All of the logic below
lives in `studySessionService` + the repositories underneath it — the
components in `src/components/study/` only render whatever phase the
`useVocabularyStudy` hook reports; none of them talk to IndexedDB directly.

**Setup:** picking a level shows real, live stats for that level (Total /
Memorized / Learning / New — never hard-coded). A level with no imported
vocabulary shows an empty-state message with a link back to import, never a
broken flashcard screen. You then pick a daily amount (10 / 15 / 20); if
fewer eligible words exist than that, the session simply uses all of them —
words are never duplicated to pad the count.

**Selection & rotation:** eligible words are anything not currently marked
`memorized`. Candidates are shuffled first (for genuine randomness), then
stable-sorted so words seen fewer times, and words reviewed longest ago (or
never), are preferred — a simple exposure/recency heuristic, not spaced
repetition. This is what keeps the daily set rotating through the whole
level instead of always surfacing the same handful of words. A session's
word list is fixed the moment it's created; refreshing or navigating away
never silently swaps it out.

**Flashcard & grading:** the front shows the Vocab only; flipping (via the
Flip button or by tapping/clicking the card itself) reveals the Reading
(used exactly as imported), Meaning, and Part of Speech. Correct/Incorrect
controls only appear after the flip, so a word can never be graded unseen.
Every answer immediately records `Times Seen +1`, plus `Times Correct +1` or
`Times Incorrect +1`, sets `Last Reviewed = now`, and updates status —
without ever resetting a word's history.

**Memorization progression** is a deliberate two-stage state machine (no
spaced-repetition scheduling in this phase):

| Current status | Correct       | Incorrect  |
| --------------- | ------------- | ---------- |
| New              | → Learning    | → Learning |
| Learning         | → Memorized   | → Learning |
| Memorized        | stays Memorized | → Learning (recovery) |

A single correct answer on a never-studied word is never treated as
mastery — it takes New → correct → Learning → correct → Memorized.

**Session progress & completion:** the on-screen "N / total" count and bar
only advance once a card is answered (flipping alone doesn't count it). The
end-of-session screen reports the actual studied/correct/incorrect counts
for that session plus the level's real Memorized-X/Y progress, with buttons
to review just the words missed in that session or return to the level.

**Level completion & review cycles:** once every word in a level is
Memorized, the Study screen shows a completion banner instead of an empty
or broken setup screen. Starting a review cycle from there makes previously
memorized words eligible again — their full history (Times Seen/Correct/
Incorrect, Last Reviewed) is preserved, not wiped, so review-cycle stats
build on top of the original ones rather than starting over.

**Session persistence:** an in-progress session (id, level, target count,
word list, current position, answers so far, start time, status) is written
to a dedicated `studySessions` IndexedDB store as you go, not just at the
end. Closing the tab, locking the phone, or refreshing mid-session never
discards it — returning to that level's Study screen detects the
unfinished session and offers **Continue** or **Start New Session**
(discarding it explicitly starts a fresh one; nothing is ever silently
restarted). The same engine and store serve N5/N4/N3/N2 identically, keyed
only by `level` — there is no per-level code duplication.

## Data & content

- **IndexedDB** (`src/data/`) holds everything the user generates: imported vocabulary, memorization/study state, quiz attempts, mistakes, settings.
- **`src/content/`** holds curated, bundled JSON (grammar notes + grammar questions), organized per level. It ships empty in this step — see `src/content/README.md` for the schema and how to add real content later.

## Requirements

Node **>= 22** (see `engines` in `package.json`). `jsdom`'s Cache Storage
API (pulled in transitively via `undici`, used by the test environment)
calls `worker_threads.markAsUncloneable`, which doesn't exist before Node
21 — on Node 20 this fails with `webidl.util.markAsUncloneable is not a
function` when the test suite starts. The GitHub Actions workflow is
pinned to Node 22 for this reason; run the same version locally to match CI.

## Known accepted risk

`xlsx` (SheetJS) is pulled from the public npm registry rather than
SheetJS's own CDN (blocked by this environment's network policy), and npm's
listing carries known ReDoS/prototype-pollution advisories with no npm fix
yet available. Since this app only ever parses a file the user picks
themselves, entirely client-side, with no server and no untrusted network
input, the exposure is minimal. If a patched npm release lands later, bump
the version; otherwise consider installing directly from
`https://cdn.sheetjs.com` from a network that allows it.
