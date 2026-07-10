import { useState, useEffect, useCallback } from 'react'
import { theme } from './theme'
import BinderGrid from './BinderGrid'
import CardDetailPopup from './CardDetailPopup'
import notebookBg from './assets/binder-notebook.png'
import { TIDE_BG } from './pixelArt'
import { navButtonClass, navButtonStyle } from './navButton'
import { getSharedBinder, getSharedBinderSlots, searchSharedBinder } from './cards'
import './styles.css'

const t = theme
const fontBase = { fontFamily: t.font.family, letterSpacing: t.font.letterSpacing }
const pageBg = { background: TIDE_BG, backgroundSize: 'cover', imageRendering: 'pixelated' }

// ponytail: localStorage cache lets a shared binder still render after the
// first successful load even if the network is gone; no service worker
// changes needed since these RPC calls are POSTs workbox won't cache anyway.
function cacheKey(token, suffix) {
  return `shared-binder:${token}:${suffix}`
}

export default function SharedBinderView({ token }) {
  const [binder, setBinder] = useState(undefined) // undefined = loading, null = not found
  const [activePage, setActivePage] = useState(1)
  const [leftSlots, setLeftSlots] = useState([])
  const [rightSlots, setRightSlots] = useState([])
  const [viewingSlot, setViewingSlot] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [editingPage, setEditingPage] = useState(false)
  const [pageJumpInput, setPageJumpInput] = useState('')

  useEffect(() => {
    let cancelled = false
    getSharedBinder(token)
      .then((result) => {
        if (cancelled) return
        setBinder(result)
        if (result) localStorage.setItem(cacheKey(token, 'binder'), JSON.stringify(result))
      })
      .catch(() => {
        if (cancelled) return
        const cached = localStorage.getItem(cacheKey(token, 'binder'))
        setBinder(cached ? JSON.parse(cached) : null)
      })
    return () => { cancelled = true }
  }, [token])

  const reloadPages = useCallback(async () => {
    try {
      const [left, right] = await Promise.all([
        getSharedBinderSlots(token, activePage),
        getSharedBinderSlots(token, activePage + 1),
      ])
      setLeftSlots(left)
      setRightSlots(right)
      localStorage.setItem(cacheKey(token, `page:${activePage}`), JSON.stringify(left))
      localStorage.setItem(cacheKey(token, `page:${activePage + 1}`), JSON.stringify(right))
    } catch {
      const cachedLeft = localStorage.getItem(cacheKey(token, `page:${activePage}`))
      const cachedRight = localStorage.getItem(cacheKey(token, `page:${activePage + 1}`))
      setLeftSlots(cachedLeft ? JSON.parse(cachedLeft) : [])
      setRightSlots(cachedRight ? JSON.parse(cachedRight) : [])
    }
  }, [token, activePage])

  useEffect(() => {
    if (binder) reloadPages()
  }, [binder, reloadPages])

  function handleSlotView(pageNumber, slotNumber, slot) {
    if (!slot) return
    setViewingSlot({ cardId: slot.card_id, variant: slot.variant ?? null, language: slot.language ?? 'en' })
  }

  async function handleSearch(e) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    setSearching(true)
    setSearchError(null)
    try {
      setResults(await searchSharedBinder(token, trimmed))
    } catch {
      setSearchError("Couldn't search this binder")
      setResults([])
    }
    setSearching(false)
  }

  function handleSelectResult(pageNumber) {
    setActivePage(pageNumber % 2 === 1 ? pageNumber : pageNumber - 1)
    setSearchOpen(false)
  }

  function handleStartEditPage() {
    setPageJumpInput(String(displayedPage))
    setEditingPage(true)
  }

  function handleCancelEditPage() {
    setEditingPage(false)
    setPageJumpInput('')
  }

  function handlePageJump(e) {
    e.preventDefault()
    const target = Number(pageJumpInput)
    if (!Number.isInteger(target) || target < 1) return
    setActivePage(target * 2 - 1)
    setEditingPage(false)
    setPageJumpInput('')
  }

  if (binder === undefined) return null
  if (binder === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-white" style={{ ...fontBase, ...pageBg }}>
        <p>This link is no longer available.</p>
      </div>
    )
  }

  const displayedPage = (activePage + 1) / 2

  return (
    <div className="flex h-screen flex-col items-center gap-4 overflow-hidden p-4" style={{ ...fontBase, ...pageBg }}>
      <span className="text-base font-semibold text-white">{binder.name}</span>

      <div className="binder-scale-wrap">
        <div id="binderView">
          <img src={notebookBg} alt="" className="binder-notebook-bg" aria-hidden="true" />
          <div className="binder-page-left">
            <BinderGrid pageNumber={activePage} slots={leftSlots} heldCard={null} onSlotView={handleSlotView} />
          </div>
          <div className="binder-page-right">
            <BinderGrid pageNumber={activePage + 1} slots={rightSlots} heldCard={null} onSlotView={handleSlotView} />
          </div>
        </div>
      </div>

      {editingPage ? (
        <form onSubmit={handlePageJump} className="flex shrink-0 items-center gap-4">
          <button type="button" onClick={handleCancelEditPage} className={navButtonClass} style={navButtonStyle}>
            Back
          </button>
          <input
            type="number"
            min="1"
            autoFocus
            value={pageJumpInput}
            onChange={(e) => setPageJumpInput(e.target.value)}
            className="w-20 rounded border border-gray-400 px-2 py-1 text-base"
          />
          <button type="submit" className={navButtonClass} style={navButtonStyle}>
            Go
          </button>
        </form>
      ) : (
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={() => setActivePage((p) => Math.max(1, p - 2))}
            disabled={activePage <= 1}
            className={navButtonClass}
            style={navButtonStyle}
          >
            Prev
          </button>
          <button type="button" onClick={handleStartEditPage} className={navButtonClass} style={navButtonStyle}>
            Page {displayedPage}
          </button>
          <button type="button" onClick={() => setActivePage((p) => p + 2)} className={navButtonClass} style={navButtonStyle}>
            Next
          </button>
          <button type="button" onClick={() => setSearchOpen(true)} className={navButtonClass} style={navButtonStyle}>
            Search
          </button>
        </div>
      )}

      {searchOpen && (
        <div className="card-search-overlay">
          <form onSubmit={handleSearch} className="card-search-bar flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a card..."
                className="rounded border border-gray-400 px-3 py-2 text-base"
              />
              <button type="submit" disabled={searching} className={navButtonClass} style={navButtonStyle}>
                {searching ? '...' : 'Find'}
              </button>
              <button type="button" onClick={() => setSearchOpen(false)} className={navButtonClass} style={navButtonStyle}>
                Close
              </button>
            </div>
          </form>
          {searchError && <p className="card-search-error">{searchError}</p>}
          {!searchError && results.length > 0 && (
            <div className="card-search-results">
              {results.map((slot) => (
                <button
                  key={`${slot.page_number}-${slot.slot_number}`}
                  type="button"
                  className="find-in-binder-result"
                  onClick={() => handleSelectResult(slot.page_number)}
                >
                  <img src={slot.card_image} alt={slot.card_name} />
                  <span>{slot.card_name}</span>
                  <span>Page {slot.page_number}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {viewingSlot && (
        <CardDetailPopup
          cardId={viewingSlot.cardId}
          language={viewingSlot.language}
          ownedVariant={viewingSlot.variant}
          onClose={() => setViewingSlot(null)}
          actions={[]}
        />
      )}
    </div>
  )
}
