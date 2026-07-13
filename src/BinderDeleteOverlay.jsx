import { useState } from 'react'
import { OverlayPanel, NavBtn, useAsync } from './ui'

export default function BinderDeleteOverlay({ listBinders, onDelete, onClose }) {
  const { data: binders, error: loadError } = useAsync(listBinders, "Couldn't load your binders")
  const [pendingDelete, setPendingDelete] = useState(null) // binder | null
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  async function handleConfirmDelete() {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await onDelete(pendingDelete.id)
      onClose()
    } catch {
      setDeleteError("Couldn't delete binder. Please try again.")
      setDeleteLoading(false)
    }
  }

  if (pendingDelete) {
    return (
      // no title row -- Escape / backdrop click cancels back to the list
      <OverlayPanel onClose={() => setPendingDelete(null)} panelStyle={{ minWidth: 260 }}>
        <p>Delete &quot;{pendingDelete.name}&quot;? This permanently removes all its cards.</p>
        {deleteError && <p className="card-search-error">{deleteError}</p>}
        <div className="flex items-center gap-2">
          <NavBtn danger onClick={handleConfirmDelete} disabled={deleteLoading}>
            {deleteLoading ? '...' : 'Yes, Delete'}
          </NavBtn>
          <NavBtn onClick={() => setPendingDelete(null)}>Cancel</NavBtn>
        </div>
      </OverlayPanel>
    )
  }

  return (
    <OverlayPanel title="Delete Binder" onClose={onClose} panelStyle={{ minWidth: 260 }}>
      {!binders && !loadError && <p>Loading...</p>}
      {loadError && <p className="card-search-error">{loadError}</p>}

      {binders && binders.length <= 1 && (
        <p>You need at least one binder — nothing to delete.</p>
      )}

      {binders && binders.length > 1 && (
        <div className="flex flex-col gap-2">
          {binders.map((binder) => (
            <div key={binder.id} className="flex items-center justify-between gap-4">
              <span>{binder.name}</span>
              <NavBtn danger onClick={() => setPendingDelete(binder)}>Delete</NavBtn>
            </div>
          ))}
        </div>
      )}
    </OverlayPanel>
  )
}
