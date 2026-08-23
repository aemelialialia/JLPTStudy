import { describe, it, expect, vi } from 'vitest'
import { vocabularyRepository } from './vocabularyRepository'
import { studyStateRepository } from './studyStateRepository'
import type { VocabularyItem } from '../../types/vocabulary'
import type { ImportPlanEntry } from '../../types/vocabularyImport'

function makeWord(overrides: Partial<VocabularyItem> = {}): VocabularyItem {
  const now = new Date().toISOString()
  return {
    id: overrides.id ?? crypto.randomUUID(),
    level: 'N5',
    vocab: '食べる',
    reading: 'たべる',
    meaning: 'to eat',
    partOfSpeech: 'Verb',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('vocabularyRepository — basic CRUD', () => {
  it('adds and retrieves a word by id', async () => {
    const word = makeWord()
    await vocabularyRepository.add(word)
    const found = await vocabularyRepository.getById(word.id)
    expect(found).toEqual(word)
  })

  it('queries by level', async () => {
    await vocabularyRepository.addMany([
      makeWord({ level: 'N5' }),
      makeWord({ level: 'N5' }),
      makeWord({ level: 'N4' }),
    ])
    expect(await vocabularyRepository.getByLevel('N5')).toHaveLength(2)
    expect(await vocabularyRepository.getByLevel('N4')).toHaveLength(1)
    expect(await vocabularyRepository.getByLevel('N3')).toHaveLength(0)
  })

  it('counts by level', async () => {
    await vocabularyRepository.addMany([makeWord({ level: 'N5' }), makeWord({ level: 'N4' })])
    expect(await vocabularyRepository.countByLevel('N5')).toBe(1)
    expect(await vocabularyRepository.countByLevel('N2')).toBe(0)
  })

  it('filters by memorization status via a join against studyState', async () => {
    const memorized = makeWord({ level: 'N5' })
    const learning = makeWord({ level: 'N5' })
    await vocabularyRepository.addMany([memorized, learning])
    await studyStateRepository.markMemorized(memorized.id)
    await studyStateRepository.recordCorrect(learning.id)

    const memorizedWords = await vocabularyRepository.getByMemorizationStatus('N5', 'memorized')
    expect(memorizedWords.map((w) => w.id)).toEqual([memorized.id])
    expect(await vocabularyRepository.countByStatus('N5', 'memorized')).toBe(1)
  })

  it('deletes a word and its associated study state', async () => {
    const word = makeWord()
    await vocabularyRepository.add(word)
    await studyStateRepository.recordCorrect(word.id)

    await vocabularyRepository.delete(word.id)

    expect(await vocabularyRepository.getById(word.id)).toBeUndefined()
    expect(await studyStateRepository.get(word.id)).toBeUndefined()
  })

  it('updates an existing word', async () => {
    const word = makeWord()
    await vocabularyRepository.add(word)
    await vocabularyRepository.update({ ...word, meaning: 'to eat (updated)' })
    expect((await vocabularyRepository.getById(word.id))?.meaning).toBe('to eat (updated)')
  })
})

describe('vocabularyRepository — search, filter, duplicate lookup', () => {
  it('searches case-insensitively across vocab/reading/meaning/partOfSpeech', async () => {
    await vocabularyRepository.addMany([
      makeWord({ vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun' }),
      makeWord({ vocab: '大きい', reading: 'おおきい', meaning: 'big', partOfSpeech: 'い-adjective' }),
    ])

    expect((await vocabularyRepository.search('N5', 'school')).map((w) => w.vocab)).toEqual(['学校'])
    expect((await vocabularyRepository.search('N5', 'おおきい')).map((w) => w.vocab)).toEqual(['大きい'])
    expect((await vocabularyRepository.search('N5', 'ADJECTIVE')).map((w) => w.vocab)).toEqual(['大きい'])
    expect(await vocabularyRepository.search('N5', 'nonexistent')).toEqual([])
  })

  it('listWithStatus joins status and applies both search and status filters', async () => {
    const school = makeWord({ vocab: '学校', reading: 'がっこう', meaning: 'school' })
    const big = makeWord({ vocab: '大きい', reading: 'おおきい', meaning: 'big' })
    await vocabularyRepository.addMany([school, big])
    await studyStateRepository.markMemorized(school.id)

    const all = await vocabularyRepository.listWithStatus('N5')
    expect(all).toHaveLength(2)
    expect(all.find((w) => w.id === school.id)?.status).toBe('memorized')
    expect(all.find((w) => w.id === big.id)?.status).toBe('new')

    expect(await vocabularyRepository.listWithStatus('N5', { status: 'memorized' })).toHaveLength(1)
    expect(await vocabularyRepository.listWithStatus('N5', { search: 'big' })).toHaveLength(1)
    expect(
      await vocabularyRepository.listWithStatus('N5', { search: 'big', status: 'memorized' }),
    ).toHaveLength(0)
  })

  it('finds a duplicate by level+vocab+reading, ignoring meaning differences', async () => {
    const word = makeWord({ vocab: '学校', reading: 'がっこう', meaning: 'school' })
    await vocabularyRepository.add(word)

    expect(await vocabularyRepository.findDuplicate('N5', '学校', 'がっこう')).toMatchObject({ id: word.id })
    expect(await vocabularyRepository.findDuplicate('N4', '学校', 'がっこう')).toBeUndefined()
    expect(await vocabularyRepository.findDuplicate('N5', '学校', 'べつのよみ')).toBeUndefined()
  })

  it('does not treat two different words with the same English meaning as duplicates', async () => {
    // Two legitimately distinct N5 words that both mean "big" in different senses would not
    // collide — duplicate detection is level+vocab+reading, never meaning alone.
    await vocabularyRepository.add(makeWord({ vocab: '大きい', reading: 'おおきい', meaning: 'big' }))
    expect(await vocabularyRepository.findDuplicate('N5', '広い', 'ひろい')).toBeUndefined()
  })

  it('random candidates exclude memorized words by default and never exceed the pool size', async () => {
    const memorized = makeWord({ id: 'w1' })
    await vocabularyRepository.addMany([
      memorized,
      makeWord({ id: 'w2', vocab: 'a', reading: 'a' }),
      makeWord({ id: 'w3', vocab: 'b', reading: 'b' }),
    ])
    await studyStateRepository.markMemorized('w1')

    const candidates = await vocabularyRepository.getRandomCandidates('N5', 10)
    expect(candidates.map((w) => w.id)).not.toContain('w1')
    expect(candidates).toHaveLength(2)

    const withMemorized = await vocabularyRepository.getRandomCandidates('N5', 10, { excludeMemorized: false })
    expect(withMemorized).toHaveLength(3)
  })

  it('prefers eligible words with lower timesSeen and older lastReviewed over ones seen recently (daily rotation)', async () => {
    const heavilySeen = makeWord({ id: 'seen', vocab: 'seen', reading: 'seen' })
    const untouched = makeWord({ id: 'untouched', vocab: 'untouched', reading: 'untouched' })
    await vocabularyRepository.addMany([heavilySeen, untouched])

    // Simulate 'seen' having already come up in several past sessions.
    await studyStateRepository.recordIncorrect('seen')
    await studyStateRepository.recordIncorrect('seen')
    await studyStateRepository.recordIncorrect('seen')

    // Asking for just 1 of the 2 eligible words should surface the
    // never-studied one, not the already-heavily-reviewed one.
    const [top] = await vocabularyRepository.getRandomCandidates('N5', 1)
    expect(top.id).toBe('untouched')
  })
})

describe('vocabularyRepository — commitImportPlan', () => {
  it('creates new vocabulary with fresh "new" study state', async () => {
    const plan: ImportPlanEntry[] = [
      { row: 2, action: 'create', draft: { vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun' } },
    ]
    const result = await vocabularyRepository.commitImportPlan('N5', plan)

    expect(result).toMatchObject({ createdCount: 1, updatedCount: 0, unchangedCount: 0, duplicateInFileCount: 0, totalForLevel: 1 })
    const [word] = await vocabularyRepository.getByLevel('N5')
    expect(word).toMatchObject({ vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun', level: 'N5' })
    expect((await studyStateRepository.get(word.id))?.status).toBe('new')
  })

  it('updates existing content while preserving id and study state', async () => {
    const existing = makeWord({ vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun' })
    await vocabularyRepository.add(existing)
    await studyStateRepository.markMemorized(existing.id)
    await studyStateRepository.recordCorrect(existing.id)
    const stateBefore = await studyStateRepository.get(existing.id)

    const plan: ImportPlanEntry[] = [
      {
        row: 2,
        action: 'update',
        existingId: existing.id,
        draft: { vocab: '学校', reading: 'がっこう', meaning: 'school (corrected)', partOfSpeech: 'Noun' },
      },
    ]
    const result = await vocabularyRepository.commitImportPlan('N5', plan)

    expect(result).toMatchObject({ createdCount: 0, updatedCount: 1 })
    const updated = await vocabularyRepository.getById(existing.id)
    expect(updated?.id).toBe(existing.id)
    expect(updated?.meaning).toBe('school (corrected)')

    // Study state must be completely untouched by a content update.
    expect(await studyStateRepository.get(existing.id)).toEqual(stateBefore)
  })

  it('skips unchanged and duplicate-in-file rows without writing anything', async () => {
    const existing = makeWord({ vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun' })
    await vocabularyRepository.add(existing)

    const plan: ImportPlanEntry[] = [
      {
        row: 2,
        action: 'unchanged',
        existingId: existing.id,
        draft: { vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun' },
      },
      {
        row: 3,
        action: 'duplicate-in-file',
        firstOccurrenceRow: 2,
        draft: { vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun' },
      },
    ]
    const result = await vocabularyRepository.commitImportPlan('N5', plan)

    expect(result).toMatchObject({ createdCount: 0, updatedCount: 0, unchangedCount: 1, duplicateInFileCount: 1, totalForLevel: 1 })
  })

  it('falls back to creating fresh when an update target no longer exists', async () => {
    const plan: ImportPlanEntry[] = [
      {
        row: 2,
        action: 'update',
        existingId: 'does-not-exist',
        draft: { vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun' },
      },
    ]
    const result = await vocabularyRepository.commitImportPlan('N5', plan)
    expect(result).toMatchObject({ createdCount: 1, updatedCount: 0 })
  })

  it('is atomic: if any write in the plan fails, none of the plan writes persist', async () => {
    // Forces a genuine IndexedDB-level failure (rather than a type-level
    // hack) by making two 'create' rows collide on id: commitImportPlan
    // uses add() (not put()) for creates specifically so a colliding id
    // throws a request-level ConstraintError, which — verified against
    // fake-indexeddb — aborts the whole transaction and rolls back every
    // write already made within it, including the first (otherwise valid)
    // row. This is the real mechanism section 21 ("do not leave the
    // database in an inconsistent state") relies on.
    const fixedId = 'fixed-id-for-collision-test'
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue(fixedId as ReturnType<typeof crypto.randomUUID>)

    const plan: ImportPlanEntry[] = [
      { row: 2, action: 'create', draft: { vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun' } },
      { row: 3, action: 'create', draft: { vocab: '大きい', reading: 'おおきい', meaning: 'big', partOfSpeech: 'い-adjective' } },
    ]

    try {
      await expect(vocabularyRepository.commitImportPlan('N5', plan)).rejects.toBeTruthy()
    } finally {
      uuidSpy.mockRestore()
    }

    // Row 2's write "succeeded" before row 3's collision aborted the
    // transaction — if the import were not atomic, it would be the only
    // one to survive. It must not: the whole import rolls back together.
    expect(await vocabularyRepository.getAll()).toHaveLength(0)
    expect(await studyStateRepository.getAll()).toHaveLength(0)
  })

  it('mixes create/update/unchanged/duplicate-in-file in a single commit correctly', async () => {
    const existing = makeWord({ vocab: '大きい', reading: 'おおきい', meaning: 'big', partOfSpeech: 'い-adjective' })
    await vocabularyRepository.add(existing)

    const plan: ImportPlanEntry[] = [
      { row: 2, action: 'create', draft: { vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun' } },
      {
        row: 3,
        action: 'update',
        existingId: existing.id,
        draft: { vocab: '大きい', reading: 'おおきい', meaning: 'big (corrected)', partOfSpeech: 'い-adjective' },
      },
      { row: 4, action: 'duplicate-in-file', firstOccurrenceRow: 2, draft: { vocab: '学校', reading: 'がっこう', meaning: 'school', partOfSpeech: 'Noun' } },
    ]

    const result = await vocabularyRepository.commitImportPlan('N5', plan)
    expect(result).toMatchObject({ createdCount: 1, updatedCount: 1, unchangedCount: 0, duplicateInFileCount: 1, totalForLevel: 2 })
    expect((await vocabularyRepository.getById(existing.id))?.meaning).toBe('big (corrected)')
  })
})
