# Content layer

Everything under `src/content/` is **curated, bundled application content** —
not user data. It ships with the app, is read-only at runtime, and is never
written to from the UI or from IndexedDB. This is deliberately separate from
`src/data/` (the IndexedDB layer), which holds the user's own mutable study
data (imported vocabulary, progress, quiz history, mistakes).

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
```

Each file is currently an empty array (`[]`). **No JLPT curriculum has been
authored as part of this foundation step** — that content will be curated
separately. The schema below is what a populated entry looks like.

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
  "difficulty": "easy"
}
```

`grammarPointId` should match a `GrammarEntry.id` in the same level's grammar
file — that link is what lets a quiz result deep-link back to the relevant
explanation (see `contentLoader.ts`'s `getGrammarEntryForQuestion`).

## Adding real content later

Hand-edit the JSON files directly, or write a small offline script that
generates them — either way, validate against the TypeScript types in
`src/types/` before committing. Nothing else in the app needs to change:
pages and services already read through `contentLoader.ts`.
