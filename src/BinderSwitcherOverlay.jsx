import { useState } from 'react'
import { OverlayPanel, NavBtn, useAsync } from './ui'

export default function BinderSwitcherOverlay({ currentBinderId, listBinders, onSwitch, onCreate, onRename, onClose }) {
  const { data: loaded, error: loadError } = useAsync(listBinders, "Couldn't load your binders")
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [renaming, setRenaming] = useState(null) // binder id | null
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const [renameError, setRenameError] = useState(null)
  const [renamed, setRenamed] = useState({}) // id -> new name, applied over the loaded list

  const binders = loaded?.map((b) => (renamed[b.id] ? { ...b, name: renamed[b.id] } : b))

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

  async function handleRename(e) {
    e.preventDefault()
    const trimmed = renameValue.trim()
    if (!trimmed) return
    setRenameLoading(true)
    setRenameError(null)
    try {
      await onRename(renaming, trimmed)
      setRenamed((prev) => ({ ...prev, [renaming]: trimmed }))
      setRenaming(null)
    } catch {
      setRenameError("Couldn't rename binder. Please try again.")
    }
    setRenameLoading(false)
  }

  return (
    <OverlayPanel title="Binders" onClose={onClose} panelStyle={{ minWidth: 260 }}>
      {!binders && !loadError && <p>Loading...</p>}
      {loadError && <p className="card-search-error">{loadError}</p>}

      {binders && (
        <div className="flex flex-col gap-2">
          {binders.map((binder) => (
            renaming === binder.id ? (
              <form key={binder.id} onSubmit={handleRename} className="flex items-center gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                  className="w-full rounded border border-gray-400 px-2 py-1 text-base"
                />
                <NavBtn type="submit" disabled={renameLoading}>{renameLoading ? '...' : 'Save'}</NavBtn>
                <NavBtn onClick={() => { setRenaming(null); setRenameError(null) }}>Cancel</NavBtn>
              </form>
            ) : (
              <div key={binder.id} className="flex items-center gap-2">
                <NavBtn
                  onClick={() => { onSwitch(binder.id, binder.name); onClose() }}
                  disabled={binder.id === currentBinderId}
                  style={{ flex: 1 }}
                >
                  {binder.name}{binder.id === currentBinderId ? ' (current)' : ''}
                </NavBtn>
                <NavBtn onClick={() => { setRenaming(binder.id); setRenameValue(binder.name); setRenameError(null) }}>
                  Rename
                </NavBtn>
              </div>
            )
          ))}
        </div>
      )}
      {renameError && <p className="card-search-error">{renameError}</p>}

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
          <NavBtn type="submit" disabled={createLoading}>{createLoading ? '...' : 'Create'}</NavBtn>
          <NavBtn onClick={() => { setCreating(false); setNewName(''); setCreateError(null) }}>Cancel</NavBtn>
        </form>
      ) : (
        <NavBtn onClick={() => setCreating(true)}>+ New Binder</NavBtn>
      )}
      {createError && <p className="card-search-error">{createError}</p>}
    </OverlayPanel>
  )
}
