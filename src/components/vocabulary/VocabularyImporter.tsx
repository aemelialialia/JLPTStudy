import { useRef, useState } from 'react'
import './vocabulary.css'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * File selection step only (spec section 4, step 2). This component does
 * not parse, validate, or otherwise inspect the file's contents — it just
 * lets the user pick one, shows what was picked (name/size/type) for
 * their own confirmation, and hands the raw File off via onFileSelected.
 * Everything after that (parsing, validation, duplicate detection) is
 * xlsxImportService's job, invoked by the parent through the
 * useVocabularyImport hook.
 */
export function VocabularyImporter({
  onFileSelected,
  disabled,
}: {
  onFileSelected: (file: File) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<File | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelected(file)
    onFileSelected(file)
  }

  return (
    <div className="vocab-field">
      <label htmlFor="vocab-file-input">Import XLSX</label>
      <input
        ref={inputRef}
        id="vocab-file-input"
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
