import { useState } from 'react'
// Reuses the vocabulary importer's own (deliberately barebone, see that
// file's header comment) styling verbatim — Phase 5 spec section 8 asks
// this flow to "mirror the existing vocabulary import UX exactly", and
// the vocabulary import UX today literally IS this styling, not a
// hypothetical redesigned one. No new visual design is introduced here.
import '../vocabulary/vocabulary.css'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** File selection step only, for grammar XLSX import — mirrors VocabularyImporter exactly (parsing/validation happens later, via grammarXlsxImportService through useGrammarImport). */
export function GrammarImporter({ onFileSelected, disabled }: { onFileSelected: (file: File) => void; disabled?: boolean }) {
  const [selected, setSelected] = useState<File | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelected(file)
    onFileSelected(file)
  }

  return (
    <div className="vocab-field">
      <label htmlFor="grammar-file-input">Import XLSX</label>
      <input
        id="grammar-file-input"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleChange}
        disabled={disabled}
      />
      {selected && (
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          {selected.name} · {formatFileSize(selected.size)} · {selected.type || 'unknown type'}
        </p>
      )}
    </div>
  )
}
