import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as XLSX from 'xlsx'
import { App } from '../App'

/**
 * End-to-end exercise of the Phase 3 flashcard/study workflow through the
 * actual rendered UI — the automated stand-in for the manual walkthrough
 * in the Phase 3 spec's verification section (27): setup -> flashcard ->
 * correct/incorrect -> learning-to-memorized promotion -> session
 * completion -> persistence/resume across a simulated reload -> level
 * separation -> full-level completion + review cycle.
 */
function buildXlsxFile(rows: string[][], fileName = 'vocab.xlsx'): File {
  const sheet = XLSX.utils.aoa_to_sheet([['Vocab', 'Reading', 'Meaning', 'Part of Speech'], ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Vocabulary')
  const arrayBuffer: ArrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new File([arrayBuffer], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function selectFile(file: File) {
  const input = screen.getByLabelText(/import xlsx/i) as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

// The app shell renders both a mobile bottom-nav and a desktop top-nav
// simultaneously (CSS/media queries pick which is visible), and both
// share aria-label="Primary" — scope to the first match; either
// instance links to the same routes, so it doesn't matter which fires.
function navLink(name: string | RegExp): HTMLElement {
  const navs = screen.getAllByRole('navigation', { name: 'Primary' })
  return within(navs[0]).getByRole('link', { name })
}

/**
 * The per-level row on the /study level picker. Its accessible name is
 * "N5 no vocabulary imported"/"N5 4/4 memorized"/etc — the href is
 * unambiguous and robust to that varying detail text.
 */
function studyLevelLink(level: string): HTMLElement {
  const link = document.querySelector(`a[href="#/study/${level}"]`)
  if (!link) throw new Error(`No study level link found for ${level}`)
  return link as HTMLElement
}

/**
 * The primary nav only has Vocabulary/Dashboard/Grammar (spec section 1)
 * — there's no longer a direct per-level nav link. Reaching a specific
 * level's vocabulary management screen (/level/:level) follows the real
 * user path: Vocabulary tab -> pick the level -> whichever link that
 * level's study screen offers back to management. A level with no
 * vocabulary yet shows EmptyVocabularyState ("Import {level}
 * Vocabulary"); one with vocabulary already imported shows StudySetup
 * ("Back to Vocabulary Management"); one that's fully memorized shows
 * LevelCompleteBanner ("Manage Vocabulary") — all three land on
 * /level/:level.
 */
async function goToLevelManagement(level: string) {
  fireEvent.click(navLink(/Vocabulary/))
  await screen.findByRole('heading', { name: 'Study Vocabulary' })
  fireEvent.click(studyLevelLink(level))
  fireEvent.click(
    await screen.findByRole('link', {
      name: new RegExp(`Import ${level} Vocabulary|Back to Vocabulary Management|Manage Vocabulary`),
    }),
  )
  await screen.findByRole('heading', { name: new RegExp(`Vocabulary — ${level}`) })
}

/** Imports the given rows into a level via the Phase 2 management UI (assumes we're already on /level/:level). */
async function importVocab(rows: string[][], fileName: string) {
  selectFile(buildXlsxFile(rows, fileName))
  fireEvent.click(await screen.findByRole('button', { name: /confirm import/i }))
  await screen.findByRole('heading', { name: 'Import Complete' })
  fireEvent.click(screen.getByRole('button', { name: /done/i }))
}

/** Flips the current flashcard and answers it, waiting for the next question (or the session-complete screen) to render. */
async function flipAndAnswer(result: 'correct' | 'incorrect') {
  fireEvent.click(await screen.findByRole('button', { name: /Reveal Answer/i }))
  const buttonName = result === 'correct' ? /Know It/i : /Again/i
  fireEvent.click(await screen.findByRole('button', { name: buttonName }))
}

/** The vocab currently shown on the flashcard — session order is randomized (spec section 4), so tests read this rather than assuming a fixed order. */
function currentCardVocab(): string {
  const el = document.querySelector('.study-flashcard__vocab')
  if (!el?.textContent) throw new Error('No flashcard vocab currently rendered')
  return el.textContent
}

describe('vocabulary study / flashcard workflow (end-to-end through the UI)', () => {
  it('runs a full study session: setup, flip, correct/incorrect, learning -> memorized, completion, and level isolation', async () => {
    render(<App />)

    // --- Import a small N5 vocabulary set via vocabulary management first (Phase 3 must reuse Phase 2's data, not invent any). ---
    await goToLevelManagement('N5')
    await importVocab(
      [
        ['学校', 'がっこう', 'school', 'Noun'],
        ['食べる', 'たべる', 'to eat', 'Verb'],
        ['大きい', 'おおきい', 'big', 'い-adjective'],
        ['静か', 'しずか', 'quiet', 'な-adjective'],
      ],
      'n5-vocab.xlsx',
    )

    // --- Setup: navigate to Study, pick N5, see real (non-fabricated) progress numbers. ---
    fireEvent.click(navLink(/Vocabulary/))
    expect(await screen.findByRole('heading', { name: 'Study Vocabulary' })).toBeInTheDocument()
    fireEvent.click(studyLevelLink('N5'))

    expect(await screen.findByRole('heading', { name: /^N5 Vocabulary$/ })).toBeInTheDocument()
    // Real counts from IndexedDB: 4 total, all new, none learning/memorized yet.
    const setupStats = screen.getByText('Total').closest('.study-stat-grid') as HTMLElement
    expect(within(setupStats).getByText('Total').previousSibling?.textContent).toBe('4')
    expect(within(setupStats).getByText('New').previousSibling?.textContent).toBe('4')
    expect(within(setupStats).getByText('Memorized').previousSibling?.textContent).toBe('0')
    expect(within(setupStats).getByText('Learning').previousSibling?.textContent).toBe('0')

    // Choose a daily amount larger than the available pool (spec section 3: never duplicate to pad it out).
    fireEvent.click(screen.getByRole('button', { name: '10' }))

    // --- Flashcard: real content, verified generically since session order is randomized (spec section 4). ---
    const WORDS: Record<string, { reading: string; meaning: string; pos: string }> = {
      学校: { reading: 'がっこう', meaning: 'school', pos: 'Noun' },
      食べる: { reading: 'たべる', meaning: 'to eat', pos: 'Verb' },
      大きい: { reading: 'おおきい', meaning: 'big', pos: 'い-adjective' },
      静か: { reading: 'しずか', meaning: 'quiet', pos: 'な-adjective' },
    }

    expect(await screen.findByText('0 / 4')).toBeInTheDocument()
    let incorrectUsed = false
    for (let i = 0; i < 4; i++) {
      const vocab = currentCardVocab()
      const info = WORDS[vocab]
      expect(info).toBeDefined() // the card shown is really one of the words we imported, nothing fabricated

      // --- Before flip: only the vocab is exposed to accessibility (both
      // faces are always in the DOM for the 3D flip, but the back face is
      // aria-hidden until flipped), and there's no way to answer yet. ---
      const frontFace = document.querySelector('.study-flashcard__face--front') as HTMLElement
      const backFace = document.querySelector('.study-flashcard__face--back') as HTMLElement
      expect(within(frontFace).getByText(vocab)).toBeInTheDocument()
      expect(backFace).toHaveAttribute('aria-hidden', 'true')
      expect(screen.queryByRole('button', { name: /Know It/i })).not.toBeInTheDocument()

      // --- Flip: reveals the full reading verbatim, meaning, and part of speech. ---
      // (The front face also always shows the reading, for reference — so
      // scope this check to the back face specifically, the only place
      // meaning/part of speech appear at all.)
      fireEvent.click(screen.getByRole('button', { name: /Reveal Answer/i }))
      expect(backFace).toHaveAttribute('aria-hidden', 'false')
      expect(within(backFace).getByText(info.reading)).toBeInTheDocument()
      expect(within(backFace).getByText(info.meaning)).toBeInTheDocument()
      expect(within(backFace).getByText(info.pos)).toBeInTheDocument()

      // Answer 学校 correctly (so its promotion new -> learning -> memorized can be tracked below);
      // mark exactly one other word incorrect along the way; everything else correct.
      if (vocab === '学校') {
        fireEvent.click(screen.getByRole('button', { name: /Know It/i }))
      } else if (!incorrectUsed) {
        incorrectUsed = true
        fireEvent.click(screen.getByRole('button', { name: /Again/i }))
      } else {
        fireEvent.click(screen.getByRole('button', { name: /Know It/i }))
      }

      if (i < 3) await screen.findByText(`${i + 1} / 4`)
    }

    // --- Session complete screen: real, computed statistics (3 correct, 1 incorrect). ---
    expect(await screen.findByRole('heading', { name: 'Study Session Complete!' })).toBeInTheDocument()
    expect(screen.getByText('4 words studied')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // Correct stat
    expect(screen.getByText('1')).toBeInTheDocument() // Incorrect stat
    expect(screen.getByText(/Memorized: 0 \/ 4/)).toBeInTheDocument() // one round of correct answers is never permanent mastery

    // Verify via the vocabulary management detail view that 学校's real study-state actually updated
    // (times seen/correct incremented, status promoted new -> learning) — not just UI-level appearance.
    fireEvent.click(screen.getByRole('button', { name: /back to n5/i }))
    await goToLevelManagement('N5')
    fireEvent.click(await screen.findByText('学校'))
    const detailCard = (await screen.findByRole('heading', { name: '学校' })).closest('.vocab-card') as HTMLElement
    expect(within(detailCard).getByText('learning')).toBeInTheDocument()
    const timesSeenRowRound1 = within(detailCard).getByText('Times seen').closest('.vocab-detail-row') as HTMLElement
    expect(within(timesSeenRowRound1).getByText('1')).toBeInTheDocument()
    const timesCorrectRowRound1 = within(detailCard).getByText('Times correct').closest('.vocab-detail-row') as HTMLElement
    expect(within(timesCorrectRowRound1).getByText('1')).toBeInTheDocument()
    fireEvent.click(within(detailCard).getByRole('button', { name: /^close$/i }))

    // --- Round 2: every word is now "learning" (round 1 promoted new -> learning regardless of
    // correct/incorrect), so answering them all correctly promotes every one to "memorized",
    // including 学校 specifically. ---
    fireEvent.click(navLink(/Vocabulary/))
    fireEvent.click(studyLevelLink('N5'))
    await screen.findByRole('heading', { name: /^N5 Vocabulary$/ })
    fireEvent.click(screen.getByRole('button', { name: '10' }))

    // Answer every card correctly this round, regardless of order, until the session completes.
    await screen.findByText('0 / 4')
    for (let i = 0; i < 4; i++) {
      await flipAndAnswer('correct')
    }
    await screen.findByRole('heading', { name: 'Study Session Complete!' })
    expect(screen.getByText(/Memorized: 4 \/ 4/)).toBeInTheDocument()

    await goToLevelManagement('N5')
    fireEvent.click(await screen.findByText('学校'))
    const memorizedCard = (await screen.findByRole('heading', { name: '学校' })).closest('.vocab-card') as HTMLElement
    expect(within(memorizedCard).getByText('memorized')).toBeInTheDocument()
    fireEvent.click(within(memorizedCard).getByRole('button', { name: /^close$/i }))

    // --- Level isolation: N4 vocabulary must never appear in N5's study pool, and vice versa. ---
    await goToLevelManagement('N4')
    await importVocab([['犬', 'いぬ', 'dog', 'Noun']], 'n4-vocab.xlsx')

    fireEvent.click(navLink(/Vocabulary/))
    fireEvent.click(studyLevelLink('N4'))
    await screen.findByRole('heading', { name: /^N4 Vocabulary$/ })
    fireEvent.click(screen.getByRole('button', { name: '10' }))
    // Both flashcard faces are always in the DOM (see the 3D-flip note
    // above) — scope to the front face's vocab element specifically.
    expect(await screen.findByText('犬', { selector: '.study-flashcard__vocab' })).toBeInTheDocument()
    expect(screen.queryByText('学校')).not.toBeInTheDocument()
    expect(screen.queryByText('食べる')).not.toBeInTheDocument()
    // Leave this N4 session unfinished on purpose — abandon it by navigating away, it must not corrupt N5's data.
  }, 20000)

  it('persists an unfinished session across a simulated reload and offers to resume it (not silently restarted)', async () => {
    const first = render(<App />)

    await goToLevelManagement('N5')
    await importVocab(
      [
        ['一', 'いち', 'one', 'Number'],
        ['二', 'に', 'two', 'Number'],
        ['三', 'さん', 'three', 'Number'],
      ],
      'numbers.xlsx',
    )

    fireEvent.click(navLink(/Vocabulary/))
    fireEvent.click(studyLevelLink('N5'))
    await screen.findByRole('heading', { name: /^N5 Vocabulary$/ })
    fireEvent.click(screen.getByRole('button', { name: '15' }))

    await screen.findByText('0 / 3')
    await flipAndAnswer('correct') // answer just one card, leave the session unfinished

    await screen.findByText('1 / 3')
    first.unmount() // simulate closing the tab / locking the phone / navigating away

    // Simulate reopening the app fresh (a real reload — IndexedDB survives, React state does not).
    render(<App />)
    fireEvent.click(navLink(/Vocabulary/))
    fireEvent.click(studyLevelLink('N5'))

    const resumePrompt = (await screen.findByText(/unfinished N5 study session/i)).closest('.study-banner') as HTMLElement
    expect(within(resumePrompt).getByText(/1 \/ 3 completed/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))
    // Resumes exactly where it left off — 1 card already answered, not a fresh 0/3.
    await screen.findByText('1 / 3')
  })

  it('detects when a level is fully memorized, offers a review cycle, and preserves history through it', async () => {
    render(<App />)

    await goToLevelManagement('N3')
    await importVocab([['犬', 'いぬ', 'dog', 'Noun']], 'n3-single.xlsx')

    // Round 1: new -> learning.
    fireEvent.click(navLink(/Vocabulary/))
    fireEvent.click(studyLevelLink('N3'))
    await screen.findByRole('heading', { name: /^N3 Vocabulary$/ })
    fireEvent.click(screen.getByRole('button', { name: '10' }))
    await flipAndAnswer('correct')
    await screen.findByRole('heading', { name: 'Study Session Complete!' })

    // Round 2: learning -> memorized. Now the whole level (1/1 words) is memorized.
    fireEvent.click(screen.getByRole('button', { name: /back to n3/i }))
    await screen.findByRole('heading', { name: /^N3 Vocabulary$/ }) // backToSetup re-derives the phase asynchronously
    fireEvent.click(screen.getByRole('button', { name: '10' }))
    await flipAndAnswer('correct')
    await screen.findByRole('heading', { name: 'Study Session Complete!' })
    expect(screen.getByText(/Memorized: 1 \/ 1/)).toBeInTheDocument()

    // Returning to the level now shows the completion state instead of a broken/empty study screen.
    fireEvent.click(screen.getByRole('button', { name: /back to n3/i }))
    expect(await screen.findByRole('heading', { name: /N3 Complete!/i })).toBeInTheDocument()
    expect(screen.getByText(/marked all N3 vocabulary as memorized/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /start review cycle/i }))

    // Starting the review cycle re-opens the word for study without erasing its history.
    await screen.findByRole('heading', { name: /^N3 Vocabulary$/ }) // back to the amount-picker, not the celebration screen
    const stats = screen.getByText('Total').closest('.study-stat-grid') as HTMLElement
    expect(within(stats).getByText('Learning').previousSibling?.textContent).toBe('1')
    expect(within(stats).getByText('Memorized').previousSibling?.textContent).toBe('0')

    await goToLevelManagement('N3')
    fireEvent.click(await screen.findByText('犬'))
    const card = (await screen.findByRole('heading', { name: '犬' })).closest('.vocab-card') as HTMLElement
    expect(within(card).getByText('learning')).toBeInTheDocument()
    // History preserved through the review cycle: two prior correct answers, not reset to 0.
    const timesSeenRow = within(card).getByText('Times seen').closest('.vocab-detail-row') as HTMLElement
    expect(within(timesSeenRow).getByText('2')).toBeInTheDocument()
  })

  it('shows a clear empty state instead of a broken flashcard screen when a level has no vocabulary', async () => {
    render(<App />)
    fireEvent.click(navLink(/Vocabulary/))
    fireEvent.click(studyLevelLink('N2'))

    expect(await screen.findByText(/no vocabulary has been imported for this level/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /import n2 vocabulary/i })).toBeInTheDocument()
  })
})
