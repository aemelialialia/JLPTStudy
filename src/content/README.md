# Content layer

Everything under `src/content/` is **curated, bundled application content** —
not user data. It ships with the app, is read-only at runtime, and is never
written to from the UI or from IndexedDB. This is deliberately separate from
`src/data/` (the IndexedDB layer), which holds the user's own mutable study
data (imported vocabulary, progress, quiz history, mistakes, and — since
Phase 5 — imported grammar entries; see "Imported grammar is not in this
directory" below).

## Why JSON files instead of a database

Grammar notes and grammar questions are fixed reference material curated by
the site owner, not generated or edited by the app at runtime. Plain JSON
files that are imported at build time are enough: they're versionable in
git, require no runtime writes, no query engine, and no migration story —
and they ship as part of the static bundle, so there's nothing to fetch and
nothing that can fail offline. If the amount of content grows large enough
that bundle size becomes a concern, these could later be lazy-loaded with
dynamic `import()` per level without changing the schema below.

## Layout

```
content/
  grammar/
    n5.json   n4.json   n3.json   n2.json     — GrammarEntry[]
  questions/
    n5.json   n4.json   n3.json   n2.json     — GrammarQuestion[]
  contentLoader.ts                            — typed accessors
  conjugation/
    contentLoader.ts                          — ConjugationTable[] (intentionally empty — see below)
  importedGrammarCache.ts                     — in-memory merge cache (see below; not bundled content itself)
```

Each level file is populated with real, curated content: 8 grammar points
and 16 quiz questions per level (N5–N2 — 32 grammar points and 64 questions
total), authored in Phase 4. The schema below is what an entry looks like.

## Grammar schema (`GrammarEntry`, see `src/types/grammar.ts`)

```jsonc
{
  "id": "n5-te-form-01",
  "level": "N5",
  "grammarPoint": "〜てください",
  "meaning": "Please do ~",
  "formation": "Verb (te-form) + ください",
  "usage": "Used to politely request that someone do something.",
  "examples": [
    { "sentence": "ここに座ってください。", "meaning": "Please sit here." }
  ],
  "notes": "Softer than an imperative; common in everyday polite requests.",
  "commonMistakes": "Learners often forget to conjugate the verb into te-form first.",
  "relatedGrammar": ["n5-te-form-02"]
}
```

`examples` is always an array, so an entry can carry one example or several
without a schema change. `notes`, `commonMistakes`, and `relatedGrammar` are
optional/may be empty but should stay present as `""` / `[]` for consistency.

## Question schema (`GrammarQuestion`, see `src/types/question.ts`)

```jsonc
{
  "id": "n5-q-0001",
  "level": "N5",
  "questionText": "ここに＿＿＿ください。",
  "choices": ["座って", "座り", "座る", "座った"],
  "correctAnswer": "座って",
  "explanation": "The te-form is required before ください to make a polite request.",
  "grammarPointId": "n5-te-form-01",
  "lessonSlideId": "n5-te-form-01::usage",
  "difficulty": "easy"
}
```

`grammarPointId` should match a `GrammarEntry.id` in the same level's grammar
file — that link is what lets a quiz result deep-link back to the relevant
explanation (see `contentLoader.ts`'s `getGrammarEntryForQuestion`).
`lessonSlideId` is optional and, when present, points to one specific slide
(`grammarSlideId()` in `src/types/grammar.ts` builds these ids as
`${grammarPointId}::${slideType}`) so "Review this grammar" from a missed
quiz question opens exactly the slide that explains it, not just the start
of the lesson.

## Adding more content later

Hand-edit the JSON files directly, or write a small offline script that
generates them — either way, validate against the TypeScript types in
`src/types/` before committing. Nothing else in the app needs to change:
pages and services already read through `contentLoader.ts`.

## Conjugation / reference tables (`conjugation/`, added in Phase 5)

`conjugation/contentLoader.ts` defines the same kind of typed,
bundled-JSON-shaped accessor pattern as the grammar/questions loader above
(`ConjugationTable`/`ConjugationRow`, see `src/types/conjugation.ts`), but
its `CONJUGATION_TABLES` array is **deliberately empty** — no verb, noun,
adjective, or plain/polite conjugation data was fabricated for this app.
The file itself documents this in a comment. The Resources → Reference
Tables UI (`/#/resources/conjugation`) is fully built against this loader
and shows an honest "not yet available" state per category rather than a
broken page. To populate it, provide real reference tables and add them to
`CONJUGATION_TABLES` following the `ConjugationTable` shape — no other code
needs to change.

## Imported grammar is not in this directory

Phase 5 added client-side XLSX import for grammar knowledge points. That
imported content is **user data, not bundled content** — it's written to
IndexedDB's `userGrammarEntries` store (`src/data/repositories/
grammarImportRepository.ts`), the same way imported vocabulary is, and is
never written into these JSON files. `src/content/importedGrammarCache.ts`
is the one file in this directory that isn't purely-bundled content: it's
an in-memory cache that merges the bundled `grammar/*.json` above with the
user's IndexedDB `userGrammarEntries`, so the rest of the app (via
`grammarLessonService`) can read "all grammar for this level" as one list
without caring which half of it came from where. If you're looking for
where a user's imported grammar actually lives, look in `src/data/`, not
here.
