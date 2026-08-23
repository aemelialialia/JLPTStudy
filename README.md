# JLPT Study — Study Buddy

A personal, local-first Japanese JLPT (N5–N2) study tool. Static site, no
backend, no account — all study data lives in your browser's IndexedDB.
Deployable for free on GitHub Pages.

**Phase 1** built the technical foundation (routing, data layer, content
layer, design tokens). **Phase 2** added a real, working vocabulary import
and database system. **Phase 3** added the vocabulary study/flashcard
system. **Phase 4** was the production frontend: a full grammar system
(curated N5–N2 content, slide-based lessons, multiple-choice quizzes with
a "review the grammar, then return to your quiz" loop), a real
Dashboard/Profile/JLPT-Level-Selection/Resources set of screens, and a
visual rebuild of every earlier screen to match an approved Stitch design
("Komorebi Study System") as closely as practical — bottom tab bar
(Vocabulary / Dashboard / Grammar) plus a slide-out drawer (JLPT Levels /
Profile / Resources). Two screens remain deliberately un-restyled: the
vocabulary import/management screen (`/level/:level`) and the data
export/import/reset actions inside Settings — both are real, working
utility surfaces with no corresponding Stitch mockup, reachable from
Study's "Back to Vocabulary Management" link and Profile's "Manage study
data" link respectively. **Phase 5** (this step) extends the existing UI
rather than replacing any of it: automatic Mistake Book mastery tracking
(3-in-a-row-since-the-last-miss, full history always preserved), a
Mistake Practice quiz mode that reuses the same quiz engine as every
other quiz, client-side Grammar XLSX import (mirroring the Phase 2
vocabulary import UX exactly), an honest, empty-by-design Grammar
Resources/Reference Tables architecture (no fabricated conjugation
content), a reordered Dashboard (JLPT goal card first), removal of the
redundant "Study N5" button from vocabulary management, and a tighter,
no-scroll-to-reach-Next Grammar Study interaction on small screens. Every
number shown anywhere in the app (daily progress, streaks, per-level
mastery, exam countdown, mistake counts) is computed from real IndexedDB
state — nothing is ever hard-coded or fabricated.

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
  types/           Domain models (VocabularyItem, StudyState, StudySession, GrammarEntry/GrammarSlide/GrammarProgress, GrammarQuestion, GrammarQuizSession, Quiz/MistakeRecord, ConjugationTable, GrammarImport*, Settings)
  content/         Curated static content, bundled JSON per JLPT level: grammar/n5..n2.json (grammar points) and questions/n5..n2.json (quiz questions), plus conjugation/ (reference-table architecture, intentionally empty — see "Grammar Resources" below). Read-only at runtime, loaded via contentLoader.ts. importedGrammarCache.ts is the one exception: an in-memory cache that merges this bundled content with user-imported grammar (see "Grammar XLSX import" below).
  data/            IndexedDB layer: db.ts (schema) + repositories/ (the only files that touch IndexedDB directly), including grammarImportRepository.ts (userGrammarEntries store)
  services/        Framework-agnostic business logic — vocabularyLearningService/studySessionService (flashcards), vocabularyQuizService (vocab MC quiz), grammarLessonService/grammarQuizSessionService (grammar lessons + quizzes, incl. Mistake Practice sessions), quizService (grammar quiz attempts + Mistake Book mastery state machine), conjugationService (reference tables), progressService (cross-cutting streak/daily-activity stats), exportImportService, xlsxImportService (vocabulary), grammarXlsxImportService (grammar)
  hooks/           Thin React bindings from services/repositories to components — one hook per screen's data needs (useVocabularyStudy, useVocabularyQuiz, useGrammarLesson, useGrammarQuiz, useGrammarImport, useImportedGrammarReady, useProfileData, useLevelOverview, useDailyVocabularyProgress, useDailyGrammarQuizPreview, ...)
  theme/           Design tokens ported from the Stitch "Komorebi Study System" (tokens.css + tokens.ts) — colors, typography, radius, shadows, spacing; every component consumes these via CSS custom properties, never hard-coded values
  components/      Presentational components, one folder per feature area: layout/ (app shell, top bar, nav drawer, bottom nav, loading screen), vocabulary/ (import/manage), study/ (flashcards + vocab quiz, shared study.css), grammar/ (hub, lesson slides, quiz, grammar XLSX importer), dashboard/, profile/, levels/, resources/ (incl. conjugation reference tables), mistakes/ (Mistake Book cards + filters), common/ (StatCard)
  pages/           Routed pages — Dashboard, LevelPage (vocab manager), StudyIndexPage/StudyPage/VocabQuizPage, GrammarIndexPage/GrammarHubPage/GrammarLessonPage/GrammarQuizPage, ConjugationIndexPage/ConjugationCategoryPage, ProfilePage, LevelSelectionPage, ResourcesPage, MistakeBook, Settings
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
level, each with the same "review this grammar" deep link, plus the
mastery tracking and Mistake Practice mode described below.

## Mistake Book mastery & Mistake Practice (Phase 5)

Every wrong answer, across every quiz mode, updates the **same**
`MistakeRecord` for that question — keyed by `questionId`, so answering
the same question wrong twice never creates a duplicate entry. The record
carries full history that is never deleted, even once a question is
Mastered: `timesWrong`, `lastWrongAt`, `timesCorrect`, `lastCorrectAt`,
and `consecutiveCorrect`.

**Mastery rule** (deliberately simple — no spaced-repetition scheduling
in this phase): a mistake starts **Active**. Each correct answer after
the *most recent* wrong answer increments `consecutiveCorrect`; reaching
3 in a row (`MASTERY_STREAK_TARGET` in `src/types/quiz.ts`) flips it to
**Mastered**. Any subsequent wrong answer on that question immediately
resets it to Active and resets the streak to 0 — but `timesWrong` /
`timesCorrect` / all historical timestamps are preserved, never zeroed.
This entire state machine lives in one place, `quizService.submitAnswer`,
so it applies identically whether the question was answered inside a
level quiz, the Daily Grammar Quiz, or Mistake Practice itself.

**Mistake Practice** (`/#/grammar/:level/quiz/mistakes`, launched from
the Mistake Book's per-level "Practice Mistakes" button, shown only when
that level has at least one Active mistake) builds a quiz session from
exactly that level's Active mistakes, shuffled, no duplicates within the
session — using the **same shared quiz engine** (`grammarQuizSessionService`
/ `useGrammarQuiz`) as every other quiz mode, not a separate
implementation. Answering correctly 3 times in a row during a practice
session can master a question mid-session, same as anywhere else.

The Mistake Book screen itself (`/#/mistakes`) adds All/Active/Mastered
filter tabs and a grammar-point filter, and each card shows the
Active/Mastered status plus the wrong/correct counts and "N/3 in a row to
master" progress described above.

## Grammar XLSX import (Phase 5, schema revised)

Grammar knowledge points can be imported client-side from `.xlsx` files,
deliberately mirroring the Phase 2 vocabulary import UX step for step:
**pick a JLPT level → pick an `.xlsx` file → parse & validate entirely in
the browser (nothing is ever uploaded anywhere) → preview (level,
filename, row counts, invalid rows with reasons, in-file duplicates, a
sample of entries) → Confirm → write to IndexedDB.** Nothing is written
until Confirm is clicked. It's reached from a collapsible "Import
Grammar" section at the bottom of each level's Grammar Hub
(`GrammarHubPage`).

The importer's column schema was revised from its original Phase 5 shape
to match a specific real-world study-tracking spreadsheet format. The
exact ten header strings it recognizes — shown verbatim everywhere the
app talks about them (error messages, the preview table, the import
section's own copy; see `GRAMMAR_COLUMN_LABELS` in
`src/types/grammarImport.ts`) — are:

| Column                            | Required | Notes                                                                 |
| ---------------------------------- | -------- | ---------------------------------------------------------------------- |
| `Category`                         | Yes      | Free text (e.g. Particles, Verb Conjugation, Request) — never forced into a fixed list. |
| `Grammar Point`                    | Yes      | The primary display name/identifier for the concept.                  |
| `Formation / Structure`            | Yes      | Preserved exactly as written — never auto-rewritten.                  |
| `English Meaning`                  | Yes      | The grammar point's core English meaning.                             |
| `Core Usage`                       | Yes      | The main study-reference explanation of when/why it's used.           |
| `Priority`                         | Yes      | Free text (e.g. High/Medium/Low) — whatever scale the source uses, preserved verbatim, never normalized. |
| `Minna no Nihongo Lesson(s)`       | Optional | Free text, may reference multiple lessons (e.g. "Lessons 20-21") — never inferred if blank. |
| `New Concept Japanese Coverage`    | Optional | Free text cross-reference — same rule: never inferred.                |
| `Notes`                            | Optional | Additional study notes, preserved verbatim.                           |
| `Mastery`                          | Optional | Source/content metadata only — see "Mastery is not live study state" below. |

**No Level column** — the spreadsheet never has, or needs, one; the level
is always the one explicitly picked in the UI before the file is
selected, same as vocabulary import. A row is only skipped as
"completely blank" when every one of the ten columns is empty; a row
missing just a required field is reported by row number and field name
(e.g. `Row 18: Missing Core Usage`) and excluded, without aborting the
rest of the import.

**Preview summary card:** Level, File, **Grammar Points** (valid +
invalid rows found), **Valid**, **Invalid**, and **Duplicates** (every
row that did *not* become a brand-new grammar point — i.e. rows matching
an already-imported point, whether updated or unchanged, plus rows
repeated within the same file), followed by a detail breakdown
(New/Updated/Unchanged/Duplicate-in-file/Blank) and a sample table with
Category/Grammar Point/Formation-Structure/English Meaning/Core
Usage/Priority columns.

**Stable ids & duplicate matching:** each imported point gets a
deterministic id, `import-<level>-<hash of the grammar point text>`
(`importedGrammarId` in `src/types/grammarImport.ts`), which doubles as
both its IndexedDB key and its identity/dedup key. Matching is primarily
`(level, Grammar Point)` — Category/Formation are never consulted for
identity, only compared afterward (along with every other field) to
decide whether a matching row is truly "unchanged" or an "update".
Re-importing the same (level, grammar point) pair — even from a
differently-named file — always resolves to the same record and never
creates a duplicate, and never resets that point's quiz history,
mistakes, or study progress (all of which live in separate stores keyed
by grammar point id or question id, untouched by a content re-import).
Quiz questions reference grammar points only by `grammarPointId`,
imported or bundled alike, never by display text.

**Mastery is not live study state:** the spreadsheet's optional `Mastery`
column is stored as `GrammarEntry.sourceMastery` — content/source
metadata only, shown on the grammar point's Study Reference slide. It is
never read as, and never overwrites, the app's actual quiz-derived
mastery, which lives entirely in `MistakeRecord` (keyed by question id,
not grammar point) and is computed purely from the user's own quiz
answers. Re-importing a spreadsheet that says `Mastery = Beginner` can
never demote a point the user has genuinely mastered through real quiz
performance — the two concepts don't share a field, a store, or a code
path.

**Merging with bundled content:** the curated N5–N2 JSON in
`src/content/grammar/` stays completely untouched and still loads exactly
as it did in Phase 4 — `contentLoader.ts`'s read-only, synchronous
contract is unchanged. Imported grammar lives separately, in IndexedDB's
`userGrammarEntries` store. A new in-memory merge cache
(`src/content/importedGrammarCache.ts`), warmed asynchronously in the
background and read synchronously via `getImportedGrammarSync()`, is what
lets `grammarLessonService` present bundled and imported grammar as one
seamless list everywhere (hub, lessons, progress) without turning every
grammar-reading component into an async one. Duplicate/update matching is
scoped to a level's previously-*imported* points only — bundled content
lives in a completely separate id space and is never a match target, so
a spreadsheet row can never silently overwrite curated content.

**Grammar Study page & Search/Filter:** every imported field is
displayed on the point's lesson page — Grammar Point and English Meaning
lead the first slide as before; Category, Priority, Minna no Nihongo
Lesson(s), New Concept Japanese Coverage, and source Mastery appear
together on a new "Study Reference" slide immediately after it (only
shown when at least one of those fields is actually present, so older
bundled points never grow an empty slide); Formation/Usage/Notes keep
their own existing slides unchanged. Category and Priority also show as
small tags on each point's browse card. The Grammar Hub's full point list
gained a Search box (matches Grammar Point/English Meaning/Core
Usage/Notes) and a Priority filter (options built from whatever values
are actually present, never a fixed list) — `grammarLessonService`
exposes the underlying `searchGrammarPoints`/`filterByPriority` helpers
so the same data model supports filtering by Category/Mastery/lesson
cross-reference later without a schema change, even though only Search
and Priority have UI today.

## Grammar Resources / Reference Tables (Phase 5)

`/#/resources/conjugation` adds the **architecture** for a verb/adjective/
noun conjugation and plain-vs-polite reference section — category
navigation, table-rendering UI, and a `ConjugationTable`/`conjugationService`
content-loading layer that mirrors the grammar content layer's shape. **No
conjugation tables are populated.** `src/content/conjugation/contentLoader.ts`
intentionally ships an empty table array with a comment explaining why —
no reference data was invented for this phase. Both the category index and
each category page show an honest "these tables haven't been added yet"
message instead of a broken or misleadingly-empty grid. Real
verb/adjective/noun conjugation and plain/polite reference tables should
be provided by you before this section is populated; once supplied, they
drop straight into `CONJUGATION_TABLES` in that same file with no further
architectural changes needed.

## Dashboard, Profile, JLPT Levels & Resources

- **Dashboard** (`/`) — the JLPT exam countdown card (real `targetLevel`/`examDate` from `/#/levels`, or a prompt to set one) is now the first content section, above the daily study cards, per the Phase 5 requirement that the JLPT goal lead the page. Below it: Daily Vocabulary Progress (a real ring gauge against `settings.dailyGoal`) and a Daily Grammar preview side by side, then a Practice More row linking only to features that actually exist (vocabulary quiz, grammar quiz, mistake review).
- **Profile** (`/#/profile`) — per-level vocabulary mastery bars and grammar "bubble row" progress, a real day-based study streak (`progressService.getCurrentStreak`, derived from existing `lastReviewed`/`QuizAttempt` timestamps, not a separately-maintained counter that could drift), and today's combined cards-studied count against the daily goal.
- **JLPT Level Selection** (`/#/levels`) — pick a target level and exam date (writes to `UserSettings`), shown alongside each level's real vocabulary/grammar progress so the choice is informed. The Dashboard's goal card reuses this same page and the same `settings` fields rather than duplicating the concept.
- **Resources** (`/#/resources`) — links to the real Vocabulary and Grammar collections, the new Reference Tables (conjugation) section above, and the official JLPT website.

## Vocabulary management

The per-level vocabulary management screen (`/#/level/:level`) no longer
has a "Study N5" (or any level-specific "Study") button — that entry
point was redundant with the dedicated Study flow reachable from the
bottom nav / Dashboard, and having two paths into flashcard study from
the management screen was confusing. This was a pure removal; no other
vocabulary-management functionality changed.

## Data & content

- **IndexedDB** (`src/data/`) holds everything the user generates: imported vocabulary, memorization/study state, grammar progress, grammar quiz sessions, quiz attempts, mistakes (with mastery state), imported grammar entries, settings.
- **`src/content/`** holds curated, bundled JSON (grammar notes + grammar questions) and the (intentionally empty) conjugation reference-table architecture, organized per level — see `src/content/README.md` for the schema.

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
