import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as XLSX from 'xlsx'
import { Settings } from '../pages/Settings'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { grammarImportRepository } from '../data/repositories/grammarImportRepository'

/**
 * End-to-end exercise of Settings' "Import Vocabulary / Grammar" section
 * (added after a report that Settings' file picker only ever accepted
 * .json — that field is the separate full-backup restore; this section
 * is the new one that accepts .xlsx content imports, reusing the exact
 * same hooks/components the Vocabulary and Grammar pages already use).
 * Renders <Settings /> directly rather than the whole <App/> — this page
 * has no route params and no navigation dependency of its own.
 */

function buildVocabXlsx(rows: string[][], fileName = 'n5_vocabulary.xlsx'): File {
  const sheet = XLSX.utils.aoa_to_sheet([['Vocab', 'Reading', 'Meaning', 'Part of Speech'], ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Vocabulary')
  const arrayBuffer: ArrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new File([arrayBuffer], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function buildGrammarXlsx(rows: string[][], fileName = 'n5_grammar.xlsx'): File {
  const headers = [
    'Category',
    'Grammar Point',
    'Formation / Structure',
    'English Meaning',
    'Core Usage',
    'Minna no Nihongo Lesson(s)',
    'New Concept Japanese Coverage',
    'Priority',
    'Notes',
    'Mastery',
  ]
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Grammar')
  const arrayBuffer: ArrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new File([arrayBuffer], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function selectFile(file: File) {
  const input = screen.getByLabelText(/import xlsx/i) as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

describe('Settings — Import Vocabulary / Grammar workflow (end-to-end through the UI)', () => {
  it('imports a vocabulary .xlsx via Settings and lists it in Uploaded Files', async () => {
    render(<Settings />)

    // Vocabulary is the default selected type, N5 the default level.
    selectFile(buildVocabXlsx([['学校', 'がっこう', 'school', 'Noun']]))

    await screen.findByText('Import Preview')
    fireEvent.click(screen.getByRole('button', { name: /confirm import/i }))
    await screen.findByText('Import Complete')
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }))

    // The real database reflects the import, not just the UI's own state.
    expect(await vocabularyRepository.getByLevel('N5')).toHaveLength(1)

    // Uploaded Files re-reads on the onImported callback and shows it.
    await waitFor(() => expect(screen.getByText('n5_vocabulary.xlsx')).toBeInTheDocument())
    expect(screen.getByText('N5 Vocabulary')).toBeInTheDocument()
  })

  it('imports a grammar .xlsx for N4 via Settings and lists it in Uploaded Files', async () => {
    render(<Settings />)

    fireEvent.click(screen.getByRole('button', { name: 'Grammar' }))
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'N4' } })

    selectFile(
      buildGrammarXlsx(
        [['Verb', '〜ている', 'Verb (te-form) + いる', 'ongoing action', 'expresses an action in progress', '', '', 'High', '', '']],
        'n4_grammar.xlsx',
      ),
    )

    await screen.findByText('Grammar Import')
    fireEvent.click(screen.getByRole('button', { name: /confirm import/i }))
    await screen.findByText('Import Complete')
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }))

    expect(await grammarImportRepository.countByLevel('N4')).toBe(1)
    await waitFor(() => expect(screen.getByText('n4_grammar.xlsx')).toBeInTheDocument())
    expect(screen.getByText('N4 Grammar')).toBeInTheDocument()
  })

  it('switching kind/level resets the flow instead of leaking stale preview state', async () => {
    render(<Settings />)

    selectFile(buildVocabXlsx([['大きい', 'おおきい', 'big', 'い-adjective']]))
    await screen.findByText('Import Preview')

    // Switch to Grammar mid-preview — should not show a stale Vocabulary preview.
    fireEvent.click(screen.getByRole('button', { name: 'Grammar' }))
    expect(screen.queryByText('Import Preview')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/import xlsx/i)).toBeInTheDocument()
  })
})
