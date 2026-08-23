# JLPT Study — Study Buddy

A personal, local-first Japanese JLPT (N5–N2) study tool. Static site, no
backend, no account — all study data lives in your browser's IndexedDB.
Deployable for free on GitHub Pages.

**Phase 1** built the technical foundation (routing, data layer, content
layer, design tokens). **Phase 2** added a real, working vocabulary import
and database system. **Phase 3** added the vocabulary study/flashcard
system. **Phase 4** (this step) is the production frontend: a full grammar
system (curated N5–N2 content, slide-based lessons, multiple-choice
quizzes with a "review the grammar, then return to your quiz" loop), a
real Dashboard/Profile/JLPT-Level-Selection/Resources set of screens, and
a visual rebuild of every earlier screen to match an approved Stitch
design ("Komorebi Study System") as closely as practical — bottom tab bar
(Vocabulary / Dashboard / Grammar) plus a slide-out drawer (JLPT Levels /
Profile / Resources). Two screens remain deliberately un-restyled: the
vocabulary import/management screen (`/level/:level`) and the data
export/import/reset actions inside Settings — both are real, working
utility surfaces with no corresponding Stitch mockup, reachable from
Study's "Back to Vocabulary Management" link and Profile's "Manage study
data" link respectively. Every number shown anywhere in the app (daily
progress, streaks, per-level mastery, exam countdown) is computed from
real IndexedDB state — nothing is ever hard-coded or fabricated.

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
  types/           Domain models (VocabularyItem, StudyState, StudySession, GrammarEntry/GrammarSlide/GrammarProgress, GrammarQuestion, GrammarQuizSession, Quiz, Settings)
  content/         Curated static content, bundled JSON per JLPT level: grammar/n5..n2.json (grammar points) and questions/n5..n2.json (quiz questions). Read-only at runtime, loaded via contentLoader.ts.
  data/            IndexedDB layer: db.ts (schema) + repositories/ (the only files that touch IndexedDB directly)
  services/        Framework-agnostic business logic — vocabularyLearningService/studySessionService (flashcards), vocabularyQuizService (vocab MC quiz), grammarLessonService/grammarQuizSessionService (grammar lessons + quizzes), quizService (grammar quiz attempts/mistakes), progressService (cross-cutting streak/daily-activity stats), exportImportService, xlsxImportService
  hooks/           Thin React bindings from services/repositories to components — one hook per screen's data needs (useVocabularyStudy, useVocabularyQuiz, useGrammarLesson, useGrammarQuiz, useProfileData, useLevelOverview, useDailyVocabularyProgress, useDailyGrammarQuizPreview, ...)
  theme/           Design tokens ported from the Stitch "Komorebi Study System" (tokens.css + tokens.ts) — colors, typography, radius, shadows, spacing; every component consumes these via CSS custom properties, never hard-coded values
  components/      Presentational components, one folder per feature area: layout/ (app shell, top bar, nav drawer, bottom nav, loading screen), vocabulary/ (import/manage), study/ (flashcards + vocab quiz, shared study.css), grammar/ (hub, lesson slides, quiz), dashboard/, profile/, levels/, resources/, mistakes/, common/ (StatCard)
  pages/           Routed pages — Dashboard, LevelPage (vocab manager), StudyIndexPage/StudyPage/VocabQuizPage, GrammarIndexPage/GrammarHubPage/GrammarLessonPage/GrammarQuizPage, ProfilePage, LevelSelectionPage, ResourcesPage, MistakeBook, Settings
  integration/     End-to-end tests driving the real rendered UI through full workflows (vocabularyWorkflow.test.tsx, studyWorkflow.test.tsx)
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

**Flashcard & grading:** a real 3D flip (not a conditional swap — both
faces are always mounted, `backface-visibility: hidden` shows only one at
a time, and the face not currently showing is `aria-hidden` so it isn't
readable to assistive tech before the user actually flips). The front
shows the Vocab and Reading; flipping (via the "Reveal Answer" button or
by tapping/clicking the card itself) reveals the Reading again plus
Meaning and Part of Speech on the back. "Again"/"Know It!" grading
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

## Grammar system

`/#/grammar`, `/#/grammar/:level`, `/#/grammar/lesson/:grammarPointId`, and
`/#/grammar/:level/quiz/:mode` — a full second study track alongside
vocabulary, built on curated content rather than user-imported data.

**Content:** 8 grammar points and 16 quiz questions per level (N5–N2, 32
points / 64 questions total), authored as flat JSON in `src/content/grammar/`
and `src/content/questions/` — see `src/content/README.md` for the schema.
Each grammar point deterministically expands into lesson slides
(`buildGrammarSlides` in `src/types/grammar.ts`); a sparse entry naturally
produces fewer slides rather than padding with empty ones.

**Hub:** the level hub (`GrammarHubPage`) shows real "quick tips" for
un-studied points, a "Current Lessons" list prioritizing what hasn't been
opened yet, the full browsable point list, and a quiz entry — all driven by
`grammarLessonService.getLevelProgress`, never a hard-coded count.

**Lessons & quizzes:** opening a lesson records real "studied" progress
(once per point, on first open — never just for appearing in a list).
Quiz sessions persist to IndexedDB (`GrammarQuizSession`, unlike the
in-memory-only vocabulary quiz) specifically so the **quiz → grammar
reference → return to quiz** loop survives navigation: missing a question
offers "Review this grammar", which deep-links to the exact lesson slide
that explains it (`GrammarQuestion.lessonSlideId`) with `?returnLevel=` /
`?returnMode=` query params that restore the in-progress quiz exactly
where it left off, rather than restarting it.

**Mistake Book** (`/#/mistakes`, reached from Dashboard's Practice More
row) collects every grammar question answered incorrectly, grouped by
level, each with the same "review this grammar" deep link.

## Dashboard, Profile, JLPT Levels & Resources

- **Dashboard** (`/`) — Daily Vocabulary Progress (a real ring gauge against `settings.dailyGoal`), the JLPT exam countdown (real `targetLevel`/`examDate`, or a prompt to set one), a Daily Grammar preview, and a Practice More row linking only to features that actually exist (vocabulary quiz, grammar quiz, mistake review).
- **Profile** (`/#/profile`) — per-level vocabulary mastery bars and grammar "bubble row" progress, a real day-based study streak (`progressService.getCurrentStreak`, derived from existing `lastReviewed`/`QuizAttempt` timestamps, not a separately-maintained counter that could drift), and today's combined cards-studied count against the daily goal.
- **JLPT Level Selection** (`/#/levels`) — pick a target level and exam date (writes to `UserSettings`), shown alongside each level's real vocabulary/grammar progress so the choice is informed.
- **Resources** (`/#/resources`) — links to the real Vocabulary and Grammar collections plus the official JLPT website. The Stitch mockup for this screen also included "Verb Conjugation Table" and "Noun/Adjective Tables" cards; neither is a real feature in this app, so — consistent with the no-dead-end-links principle used throughout (e.g. Dashboard's Practice More row) — they were omitted rather than linking to a page that doesn't exist.

## Data & content

- **IndexedDB** (`src/data/`) holds everything the user generates: imported vocabulary, memorization/study state, grammar progress, grammar quiz sessions, quiz attempts, mistakes, settings.
- **`src/content/`** holds curated, bundled JSON (grammar notes + grammar questions), organized per level — see `src/content/README.md` for the schema.

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
