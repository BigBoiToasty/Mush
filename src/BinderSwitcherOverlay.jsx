import { useState, useEffect } from 'react'
import { navButtonClass, navButtonStyle } from './navButton'

export default function BinderSwitcherOverlay({ currentBinderId, listBinders, onSwitch, onCreate, onClose }) {
  const [binders, setBinders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState(null)

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

  async function handleCreate(e) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setCreateLoading(true)
    setCreateError(null)
    const created = await onCreate(trimmed)
    setCreateLoading(false)
    if (!created) {
      setCreateError("Couldn't create binder. Please try again.")
      return
    }
    onClose()
  }

  return (
    <div className="card-search-overlay">
      <div className="card-search-bar flex flex-col gap-3" style={{ minWidth: 260 }}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-base font-semibold">Binders</span>
          <button type="button" onClick={onClose} className={navButtonClass} style={navButtonStyle}>
            Close
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {loadError && <p className="card-search-error">{loadError}</p>}

        {!loading && !loadError && (
          <div className="flex flex-col gap-2">
            {binders.map((binder) => (
              <button
                key={binder.id}
                type="button"
                onClick={() => { onSwitch(binder.id, binder.name); onClose() }}
                disabled={binder.id === currentBinderId}
                className={navButtonClass}
                style={navButtonStyle}
              >
                {binder.name}{binder.id === currentBinderId ? ' (current)' : ''}
              </button>
            ))}
          </div>
        )}

        {creating ? (
          <form onSubmit={handleCreate} className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Binder name"
              autoFocus
              className="w-full rounded border border-gray-400 px-2 py-1 text-base"
            />
            <button type="submit" disabled={createLoading} className={navButtonClass} style={navButtonStyle}>
              {createLoading ? '...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewName(''); setCreateError(null) }}
              className={navButtonClass}
              style={navButtonStyle}
            >
              Cancel
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setCreating(true)} className={navButtonClass} style={navButtonStyle}>
            + New Binder
          </button>
        )}
        {createError && <p className="card-search-error">{createError}</p>}
      </div>
    </div>
  )
}
