import { useState, useEffect, useCallback, useRef } from 'react'
import BinderGrid from './BinderGrid'
import CardDetailPopup from './CardDetailPopup'
import notebookBg from './assets/binder-notebook.png'
import { fontBase, pageBg, NavBtn, PageNav, spreadStartForPage, usePageSwipe, useSinglePageMode, useDismiss } from './ui'
import { cacheShared, readShared } from './offlineCache'
import { getSharedBinder, getSharedBinderSlots, searchSharedBinder } from './cards'
import './styles.css'

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
  // Registered for the page's lifetime (the search overlay is inline JSX, not
  // its own component); dismissing while closed is a no-op.
  const onSearchBackdropClick = useDismiss(() => setSearchOpen(false))
  // Same portrait-phone single-page fold as BinderPage.
  const singlePage = useSinglePageMode()
  const [half, setHalf] = useState(0)
  const singlePageRef = useRef(singlePage)
  singlePageRef.current = singlePage
  const stateRef = useRef({ activePage, half })
  stateRef.current = { activePage, half }

  const goToPage = useCallback((pageNumber) => {
    const page = Math.max(1, pageNumber)
    setActivePage(spreadStartForPage(page))
    setHalf(page % 2 === 0 ? 1 : 0)
  }, [])

  const flip = useCallback((dir) => {
    if (singlePageRef.current) goToPage(stateRef.current.activePage + stateRef.current.half + dir)
    else setActivePage((p) => (dir > 0 ? p + 2 : Math.max(1, p - 2)))
  }, [goToPage])

  const swipeHandlers = usePageSwipe(flip)

  useEffect(() => {
    let cancelled = false
    getSharedBinder(token)
      .then((result) => {
        if (cancelled) return
        setBinder(result)
        if (result) cacheShared(token, 'binder', result)
      })
      .catch(() => {
        // offline: fall back to the last successfully loaded copy
        if (!cancelled) setBinder(readShared(token, 'binder'))
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
      cacheShared(token, `page:${activePage}`, left)
      cacheShared(token, `page:${activePage + 1}`, right)
    } catch {
      setLeftSlots(readShared(token, `page:${activePage}`) ?? [])
      setRightSlots(readShared(token, `page:${activePage + 1}`) ?? [])
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
    goToPage(pageNumber)
    setSearchOpen(false)
  }

  if (binder === undefined) return null
  if (binder === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-white" style={{ ...fontBase, ...pageBg }}>
        <p>This link is no longer available.</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col items-center gap-4 overflow-hidden p-4" style={{ ...fontBase, ...pageBg }}>
      <span className="text-base font-semibold text-white">{binder.name}</span>

      <div className="binder-scale-wrap" {...swipeHandlers}>
        {singlePage ? (
          <div id="binderView" className={`binder-single ${half ? 'binder-single--right' : ''}`}>
            <img src={notebookBg} alt="" className="binder-notebook-bg" aria-hidden="true" />
            <div className="binder-page-single">
              <BinderGrid pageNumber={activePage + half} slots={half ? rightSlots : leftSlots} heldCard={null} onSlotView={handleSlotView} />
            </div>
          </div>
        ) : (
          <div id="binderView">
            <img src={notebookBg} alt="" className="binder-notebook-bg" aria-hidden="true" />
            <div className="binder-page-left">
              <BinderGrid pageNumber={activePage} slots={leftSlots} heldCard={null} onSlotView={handleSlotView} />
            </div>
            <div className="binder-page-right">
              <BinderGrid pageNumber={activePage + 1} slots={rightSlots} heldCard={null} onSlotView={handleSlotView} />
            </div>
          </div>
        )}
      </div>

      <PageNav
        page={singlePage ? activePage + half : (activePage + 1) / 2}
        onPrev={() => flip(-1)}
        onNext={() => flip(1)}
        prevDisabled={activePage <= 1 && (!singlePage || half === 0)}
        onJump={(n) => (singlePage ? goToPage(n) : setActivePage(n * 2 - 1))}
      >
        <NavBtn onClick={() => setSearchOpen(true)}>Search</NavBtn>
      </PageNav>

      {searchOpen && (
        <div className="card-search-overlay" onClick={onSearchBackdropClick}>
          <form onSubmit={handleSearch} className="card-search-bar flex flex-col gap-2">
            <div className="flex flex-wrap justify-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a card..."
                className="rounded border border-gray-400 px-3 py-2 text-base"
              />
              <NavBtn type="submit" disabled={searching}>{searching ? '...' : 'Find'}</NavBtn>
              <NavBtn onClick={() => setSearchOpen(false)}>Close</NavBtn>
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
