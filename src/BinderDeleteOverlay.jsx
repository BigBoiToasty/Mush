import { useState, useEffect } from 'react'
import { navButtonClass, navButtonStyle, dangerButtonStyle } from './navButton'

export default function BinderDeleteOverlay({ listBinders, onDelete, onClose }) {
  const [binders, setBinders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null) // binder | null
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    let cancelled = false
    listBinders()
      .then((list) => {
        if (cancelled) return
        setBinders(list)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError("Couldn't load your binders")
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [listBinders])

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
      <div className="card-search-overlay">
        <div className="card-search-bar flex flex-col gap-3" style={{ minWidth: 260 }}>
          <p>Delete &quot;{pendingDelete.name}&quot;? This permanently removes all its cards.</p>
          {deleteError && <p className="card-search-error">{deleteError}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className={navButtonClass}
              style={dangerButtonStyle}
            >
              {deleteLoading ? '...' : 'Yes, Delete'}
            </button>
            <button type="button" onClick={() => setPendingDelete(null)} className={navButtonClass} style={navButtonStyle}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card-search-overlay">
      <div className="card-search-bar flex flex-col gap-3" style={{ minWidth: 260 }}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-base font-semibold">Delete Binder</span>
          <button type="button" onClick={onClose} className={navButtonClass} style={navButtonStyle}>
            Close
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {loadError && <p className="card-search-error">{loadError}</p>}

        {!loading && !loadError && binders.length <= 1 && (
          <p>You need at least one binder — nothing to delete.</p>
        )}

        {!loading && !loadError && binders.length > 1 && (
          <div className="flex flex-col gap-2">
            {binders.map((binder) => (
              <div key={binder.id} className="flex items-center justify-between gap-4">
                <span>{binder.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingDelete(binder)}
                  className={navButtonClass}
                  style={dangerButtonStyle}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
