import { useRef, useState } from 'react'
import { NavBtn, OverlayPanel } from './ui'
import { getAllBinderSlots, importSlots } from './binderDb'
import { slotsToCsv, csvToSlots } from './csv'

// Export downloads the binder as CSV right away; import opens a file picker,
// then a confirm panel (<CsvImportPanel>) before anything is written.
export function useCsvTransfer(binderId, binderName, onImported) {
  const fileInputRef = useRef(null)
  const [pendingImport, setPendingImport] = useState(null) // { slots } | { error } | null
  const [importing, setImporting] = useState(false)

  async function exportCsv() {
    const slots = await getAllBinderSlots(binderId)
    const url = URL.createObjectURL(new Blob([slotsToCsv(binderName, slots)], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${binderName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    try {
      setPendingImport({ slots: csvToSlots(await file.text()) })
    } catch (err) {
      setPendingImport({ error: err.message })
    }
  }

  async function confirmImport() {
    setImporting(true)
    try {
      await importSlots(binderId, pendingImport.slots)
      setPendingImport(null)
      await onImported()
    } catch {
      setPendingImport({ error: "Couldn't import. Check your connection and try again." })
    }
    setImporting(false)
  }

  return {
    exportCsv,
    pickFile: () => fileInputRef.current?.click(),
    busy: !!pendingImport,
    panelProps: {
      fileInputRef, handleFile, pendingImport, importing, binderName,
      onConfirm: confirmImport,
      onCancel: () => setPendingImport(null),
    },
  }
}

export function CsvImportPanel({ fileInputRef, handleFile, pendingImport, importing, binderName, onConfirm, onCancel }) {
  return (
    <>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
      {pendingImport && (
        <OverlayPanel onClose={onCancel} panelStyle={{ minWidth: 280, maxWidth: 400 }}>
          {pendingImport.error ? (
            <p className="card-search-error">{pendingImport.error}</p>
          ) : (
            <p>
              Import {pendingImport.slots.length} card{pendingImport.slots.length === 1 ? '' : 's'} into
              &quot;{binderName}&quot;? Cards already in those slots will be replaced.
            </p>
          )}
          <div className="flex items-center gap-2">
            {!pendingImport.error && (
              <NavBtn onClick={onConfirm} disabled={importing}>
                {importing ? '...' : 'Import'}
              </NavBtn>
            )}
            <NavBtn onClick={onCancel}>{pendingImport.error ? 'Close' : 'Cancel'}</NavBtn>
          </div>
        </OverlayPanel>
      )}
    </>
  )
}
