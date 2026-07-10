import { useState } from 'react'
import { navButtonClass, navButtonStyle } from './navButton'

export default function FindInBinderOverlay({ onFind, onFindAll, onSelectResult, onClose }) {
  const [query, setQuery] = useState('')
  const [allBinders, setAllBinders] = useState(false)
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const found = await (allBinders ? onFindAll(trimmed) : onFind(trimmed))
      setResults(found)
      setSearched(true)
    } catch (err) {
      console.error('Find in binder error:', err)
      setError("Couldn't search your binder")
      setResults([])
      setSearched(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-search-overlay">
      <form onSubmit={handleSearch} className="card-search-bar flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a card in your binder..."
            className="rounded border border-gray-400 px-3 py-2 text-base"
          />
          <button type="submit" disabled={loading} className={navButtonClass} style={navButtonStyle}>
            {loading ? '...' : 'Find'}
          </button>
          <button type="button" onClick={onClose} className={navButtonClass} style={navButtonStyle}>
            Cancel
          </button>
        </div>
        <label className="flex items-center gap-2 text-white">
          <input type="checkbox" checked={allBinders} onChange={(e) => setAllBinders(e.target.checked)} />
          Search all binders
        </label>
      </form>
      {error && <p className="card-search-error">{error}</p>}
      {!error && searched && results.length === 0 && <p className="card-search-error">No matches in your binder</p>}
      {results.length > 0 && (
        <div className="card-search-results">
          {results.map((slot) => (
            <button
              key={`${slot.binder_id}-${slot.page_number}-${slot.slot_number}`}
              type="button"
              className="find-in-binder-result"
              onClick={() => onSelectResult(slot.page_number, slot.binder_id, slot.binder_name)}
            >
              <img src={slot.card_image} alt={slot.card_name} />
              <span>{slot.card_name}</span>
              <span>Page {slot.page_number}{slot.binder_name ? ` — ${slot.binder_name}` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
