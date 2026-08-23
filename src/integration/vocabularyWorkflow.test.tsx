import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import * as XLSX from 'xlsx'
import { App } from '../App'

/**
 * End-to-end exercise of the Phase 2 workflow through the actual rendered
 * UI (not just the services directly) — this is the automated stand-in
 * for the manual walkthrough in the Phase 2 spec's verification section:
 * select level -> import XLSX -> preview -> confirm -> see it in the
 * list -> search/filter -> open detail -> change study state -> re-import
 * to confirm duplicate/study-state-preservation behavior -> cross-level
 * isolation.
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

// The dashboard page also renders a per-level link (e.g. "N5") alongside
// the primary nav bar's own "N5" link, so a plain getByRole('link', {name})
// matches both. Scope navigation clicks to the nav bar specifically.
function navLink(name: string): HTMLElement {
  const nav = screen.getByRole('navigation', { name: 'Primary' })
  return within(nav).getByRole('link', { name })
}

describe('vocabulary import workflow (end-to-end through the UI)', () => {
  it('imports, lists, searches, filters, and updates study state for N5 — and keeps N4 isolated', async () => {
    render(<App />)

    // 1. Navigate to N5 via the nav (as a user would).
    fireEvent.click(navLink('N5'))
    expect(await screen.findByRole('heading', { name: /Vocabulary — N5/i })).toBeInTheDocument()

    // 2/3. Select and parse an XLSX file.
    selectFile(
      buildXlsxFile([
        ['学校', 'がっこう', 'school', 'Noun'],
        ['食べる', 'たべる', 'to eat', 'Verb'],
      ]),
    )

    // 7. Preview appears before anything is written.
    expect(await screen.findByRole('heading', { name: 'Import Preview' })).toBeInTheDocument()
    expect(screen.getByText('N5', { selector: 'dd' })).toBeInTheDocument()

    // 8. Confirm import.
    fireEvent.click(screen.getByRole('button', { name: /confirm import/i }))
    expect(await screen.findByRole('heading', { name: 'Import Complete' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /done/i }))

    // 9. Vocabulary appears in N5.
    expect(await screen.findByText('学校')).toBeInTheDocument()
    expect(screen.getByText('食べる')).toBeInTheDocument()

    // 12. Search narrows the list.
    fireEvent.change(screen.getByLabelText(/search/i), { target: { value: 'school' } })
    await waitFor(() => expect(screen.queryByText('食べる')).not.toBeInTheDocument())
    expect(screen.getByText('学校')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/search/i), { target: { value: '' } })
    await screen.findByText('食べる')

    // 13. Filter by status — everything just imported is "new".
    fireEvent.change(screen.getByLabelText(/^status$/i), { target: { value: 'memorized' } })
    await waitFor(() => expect(screen.queryByText('学校')).not.toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/^status$/i), { target: { value: 'all' } })
    await screen.findByText('学校')

    // 14. Open a vocabulary item's detail.
    fireEvent.click(screen.getByText('学校'))
    expect(await screen.findByRole('heading', { name: '学校' })).toBeInTheDocument()

    // 15/16/17. Mark Learning -> Mark Memorized -> Reset Status, using the real study-state controls.
    fireEvent.click(screen.getByRole('button', { name: /mark learning/i }))
    await waitFor(() => expect(within(screen.getByRole('heading', { name: '学校' }).closest('.vocab-card')!).getByText('learning')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /mark memorized/i }))
    await waitFor(() => expect(within(screen.getByRole('heading', { name: '学校' }).closest('.vocab-card')!).getByText('memorized')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /reset status/i }))
    await waitFor(() => expect(within(screen.getByRole('heading', { name: '学校' }).closest('.vocab-card')!).getByText('new')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^close$/i }))

    // 18/19/20. Re-import the same word (with an updated meaning) plus a genuinely new one.
    // Mark 学校 memorized first, to prove re-import does not reset study state.
    fireEvent.click(screen.getByText('学校'))
    fireEvent.click(await screen.findByRole('button', { name: /mark memorized/i }))
    await waitFor(() => expect(within(screen.getByRole('heading', { name: '学校' }).closest('.vocab-card')!).getByText('memorized')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }))

    selectFile(buildXlsxFile([['学校', 'がっこう', 'a school (corrected)', 'Noun']], 'vocab2.xlsx'))
    expect(await screen.findByRole('heading', { name: 'Import Preview' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /confirm import/i }))
    await screen.findByRole('heading', { name: 'Import Complete' })
    fireEvent.click(screen.getByRole('button', { name: /done/i }))

    // Study state preserved across re-import: still memorized, not reset to "new".
    fireEvent.click(screen.getByText('学校'))
    await waitFor(() => expect(within(screen.getByRole('heading', { name: '学校' }).closest('.vocab-card')!).getByText('memorized')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }))

    // 21/22. Import into N4 and confirm it does not leak into N5's list.
    fireEvent.click(navLink('N4'))
    expect(await screen.findByRole('heading', { name: /Vocabulary — N4/i })).toBeInTheDocument()
    // The list refetches asynchronously on level change, so the previous
    // level's rows may still be on screen for a moment — wait it out
    // rather than asserting on the pre-fetch render.
    await waitFor(() => expect(screen.queryByText('学校')).not.toBeInTheDocument())

    selectFile(buildXlsxFile([['大きい', 'おおきい', 'big', 'い-adjective']], 'n4.xlsx'))
    fireEvent.click(await screen.findByRole('button', { name: /confirm import/i }))
    await screen.findByRole('heading', { name: 'Import Complete' })
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(await screen.findByText('大きい')).toBeInTheDocument()

    fireEvent.click(navLink('N5'))
    await screen.findByText('学校')
    expect(screen.queryByText('大きい')).not.toBeInTheDocument() // 23. cross-level isolation confirmed
  })

  it('reports invalid rows in the preview instead of silently dropping or crashing on them', async () => {
    render(<App />)
    fireEvent.click(navLink('N3'))
    await screen.findByRole('heading', { name: /Vocabulary — N3/i })

    selectFile(
      buildXlsxFile([
        ['静か', 'しずか', 'quiet', 'な-adjective'],
        ['早く', '', 'quickly', ''], // invalid: missing Reading + Part of Speech
      ]),
    )

    expect(await screen.findByRole('heading', { name: 'Import Preview' })).toBeInTheDocument()
    expect(screen.getByText(/Row 3: Missing Reading, Missing Part of Speech/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /confirm import/i }))
    expect(await screen.findByRole('heading', { name: 'Import Complete' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /done/i }))

    expect(await screen.findByText('静か')).toBeInTheDocument()
    expect(screen.queryByText('早く')).not.toBeInTheDocument() // the invalid row was never imported
  })
})
