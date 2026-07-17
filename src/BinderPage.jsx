import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useBinder } from './useBinder'
import BinderGrid from './BinderGrid'
import CardSearchOverlay from './CardSearchOverlay'
import CardDetailPopup from './CardDetailPopup'
import FindInBinderOverlay from './FindInBinderOverlay'
import BinderSwitcherOverlay from './BinderSwitcherOverlay'
import BinderStatsOverlay from './BinderStatsOverlay'
import BinderDeleteOverlay from './BinderDeleteOverlay'
import ShareOverlay from './ShareOverlay'
import SetCompletionOverlay from './SetCompletionOverlay'
import OfflineReadyOverlay from './OfflineReadyOverlay'
import notebookBg from './assets/binder-notebook.png'
import BackgroundPicker from './BackgroundPicker'
import { fontBase, pageBg, binderPageBg, NavBtn, PageNav, OverlayPanel, ButtonSkinPicker, DropdownMenu, spreadStartForPage, usePageSwipe, LoadingScreen } from './ui'
import { planMove, getAllBinderSlots, slotsToCsv, csvToSlots, importSlots, getBinderBackground } from './cards'
import { syncAllForOffline } from './offlineSync'
import { readSlots } from './offlineCache'
import { flushQueue } from './offlineQueue'
import './styles.css'

// A DB slot row uses snake_case; placeCard expects the camelCase card shape.
function slotToCard(slot) {
  return {
    cardId: slot.card_id,
    cardImage: slot.card_image,
    variant: slot.variant,
    cardName: slot.card_name,
    language: slot.language,
    customFoilType: slot.custom_foil_type,
  }
}

function CardBanner({ image, onCancel, children }) {
  return (
    <div className="flex shrink-0 items-center gap-2 text-white">
      <img src={image} alt="" className="h-10" />
      <span>{children}</span>
      <NavBtn onClick={onCancel}>Cancel</NavBtn>
    </div>
  )
}

// [label, action key, danger?] for the "More" dropdown. Keys are overlay
// names except 'export', which downloads immediately instead.
const MENU_ITEMS = [
  ['Find in Binder', 'find'],
  ['Binders', 'switcher'],
  ['Binder Info', 'stats'],
  ['Share Binder', 'share'],
  ['Set Completion', 'completion'],
  ['Button Style', 'buttonStyle'],
  ['Binder Background', 'background'],
  ['Export CSV', 'export'],
  ['Import CSV', 'import'],
  ['Delete Binder', 'delete', true],
]

export default function BinderPage({ userId }) {
  const {
    binderId, binderName, loading, error, fetchPage, placeCard, removeCard, findInBinder, findInAllBinders,
    listBinders, switchBinder, createBinder, renameBinder, deleteBinder, getCounts, getWorth,
    getShareToken, setShareToken, getCompletion, getSetCards,
  } = useBinder(userId)
  // Survives a remount (alt-tab away/back can retrigger auth or reload the
  // backgrounded tab) so the user doesn't get bounced back to page 1.
  const [activePage, setActivePage] = useState(() => Number(sessionStorage.getItem('mush:activePage')) || 1)
  // null means "not yet loaded" (distinct from a confirmed-empty []),
  // so BinderGrid can show shimmer placeholders instead of empty-slot buttons.
  const [leftSlots, setLeftSlots] = useState(null)
  const [rightSlots, setRightSlots] = useState(null)
  const [backgroundUrl, setBackgroundUrl] = useState(null)
  // Only one full-screen overlay can be open at a time:
  // 'search' | 'find' | 'switcher' | 'stats' | 'share' | 'completion' | 'delete' | 'offlineInfo' | null
  const [overlay, setOverlay] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSlot, setActiveSlot] = useState(null) // { pageNumber, slotNumber } | null
  const [pendingCard, setPendingCard] = useState(null) // card picked from top search, awaiting a slot
  const [viewingSlot, setViewingSlot] = useState(null) // { pageNumber, slotNumber, card } | null
  const [heldCard, setHeldCard] = useState(null) // { srcPage, srcSlot, card } | null, a card picked up to move
  const [actionError, setActionError] = useState(null)
  const [offlineReady, setOfflineReady] = useState(false)
  const [lastPage, setLastPage] = useState(0) // highest page holding a card
  const [pendingImport, setPendingImport] = useState(null) // { slots } | { error } | null
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)
  const loadSeq = useRef(0)
  const activePageRef = useRef(activePage)
  activePageRef.current = activePage
  const swipeHandlers = usePageSwipe(setActivePage)

  const reloadPages = useCallback(async () => {
    if (!binderId) return
    // Sequence guard: a slower, older fetch pair must not overwrite the
    // slots of the page the user has since navigated to.
    const seq = ++loadSeq.current
    // Cache-first: show the last-synced spread instantly so page flips never
    // wait on a slow network; the live fetch below replaces it when it lands.
    const cachedLeft = readSlots(binderId, activePage)
    const cachedRight = readSlots(binderId, activePage + 1)
    if (cachedLeft || cachedRight) {
      setLeftSlots(cachedLeft ?? [])
      setRightSlots(cachedRight ?? [])
    }
    const [left, right, counts] = await Promise.all([
      fetchPage(activePage),
      fetchPage(activePage + 1),
      getCounts(), // keeps "Page X / Y" current after placements/removals
    ])
    if (seq !== loadSeq.current) return
    setLeftSlots(left)
    setRightSlots(right)
    setLastPage(counts.pageCount)
  }, [binderId, activePage, fetchPage, getCounts])

  useEffect(() => {
    reloadPages()
  }, [reloadPages])

  useEffect(() => {
    if (!binderId) return
    let cancelled = false
    getBinderBackground(binderId).then((url) => { if (!cancelled) setBackgroundUrl(url) })
    return () => { cancelled = true }
  }, [binderId])

  useEffect(() => {
    sessionStorage.setItem('mush:activePage', String(activePage))
  }, [activePage])

  // Once per binder, when online, cache the whole collection for offline viewing.
  // offlineReady flips once every card image has actually been fetched, so it's
  // safe to tell the user they can go offline and still scroll/search. The
  // currently open spread is passed as `priority` so its images are fetched
  // first (see syncAllForOffline) -- the visible page shows up fast, and
  // everything else loads behind it while no one's watching. Reads activePage
  // from a ref (not a dependency) so flipping pages doesn't restart the sync.
  useEffect(() => {
    if (!binderId || !navigator.onLine) return
    let cancelled = false
    setOfflineReady(false)
    syncAllForOffline(userId, { binderId, page: activePageRef.current })
      .then(() => { if (!cancelled) setOfflineReady(true) })
    return () => { cancelled = true }
  }, [userId, binderId])

  // Replay writes queued while offline -- on reconnect, and once on mount to
  // catch anything left over from a previous session.
  useEffect(() => {
    const flush = async () => {
      if ((await flushQueue()) > 0) reloadPages()
    }
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [reloadPages])

  function resetForBinderChange() {
    setActivePage(1)
    setActiveSlot(null)
    setPendingCard(null)
    setViewingSlot(null)
    setHeldCard(null)
    setActionError(null)
  }

  function handleSwitchBinder(id, name) {
    switchBinder(id, name)
    resetForBinderChange()
  }

  async function handleCreateBinder(name) {
    const created = await createBinder(name)
    if (created) resetForBinderChange()
    return created
  }

  function handleFindResultSelect(pageNumber, resultBinderId, resultBinderName) {
    if (resultBinderId !== binderId) handleSwitchBinder(resultBinderId, resultBinderName)
    setActivePage(spreadStartForPage(pageNumber))
    setOverlay(null)
  }

  async function handleDeleteBinder(idToDelete) {
    await deleteBinder(idToDelete)
    if (idToDelete === binderId) {
      const remaining = await listBinders()
      if (remaining[0]) handleSwitchBinder(remaining[0].id, remaining[0].name)
    }
  }

  // Shared DB error handling: run the action, surface a message on failure.
  // Returns false on failure so callers can keep their in-flight state
  // (pendingCard/heldCard/activeSlot) and let the user retry another slot.
  async function runDb(action, message) {
    setActionError(null)
    try {
      await action()
    } catch {
      setActionError(message)
      return false
    }
    return true
  }

  async function runMove(dest, destCard) {
    if (!heldCard) return
    const src = { page: heldCard.srcPage, slot: heldCard.srcSlot }
    const ops = planMove(src, dest, heldCard, destCard)
    const ok = await runDb(async () => {
      for (const op of ops) {
        if (op.type === 'place') await placeCard(op.page, op.slot, op.card)
        else await removeCard(op.page, op.slot)
      }
    }, "Couldn't move the card. Please try again.")
    if (!ok) return
    setHeldCard(null)
    await reloadPages()
  }

  async function placeCardAt(pageNumber, slotNumber, card) {
    const ok = await runDb(
      () => placeCard(pageNumber, slotNumber, card),
      "Couldn't save the card. Please try again.",
    )
    if (!ok) return
    setPendingCard(null)
    setActiveSlot(null)
    await reloadPages()
  }

  function handleSlotChoose(pageNumber, slotNumber) {
    if (heldCard) return runMove({ page: pageNumber, slot: slotNumber }, null)
    if (pendingCard) return placeCardAt(pageNumber, slotNumber, pendingCard)
    setActiveSlot({ pageNumber, slotNumber })
  }

  function handleSlotView(pageNumber, slotNumber, slot) {
    if (heldCard) return runMove({ page: pageNumber, slot: slotNumber }, slotToCard(slot))
    if (pendingCard) return placeCardAt(pageNumber, slotNumber, pendingCard)
    // ?? null: view mode must always pass a defined ownedVariant — undefined
    // would flip CardDetailPopup into add mode and show the variant picker.
    setViewingSlot({
      pageNumber,
      slotNumber,
      card: { ...slotToCard(slot), variant: slot.variant ?? null, language: slot.language ?? 'en' },
    })
  }

  function handleMoveViewingSlot() {
    if (!viewingSlot) return
    setHeldCard({ srcPage: viewingSlot.pageNumber, srcSlot: viewingSlot.slotNumber, card: viewingSlot.card })
    setViewingSlot(null)
  }

  // placeCardAt upserts on (page, slot), so re-placing the same card with a
  // new variant/foil type simply overwrites the existing row -- no separate update path.
  async function handleChangeVariant(variant, customFoilType) {
    if (!viewingSlot) return
    const unchanged = variant === viewingSlot.card.variant
      && customFoilType === (viewingSlot.card.customFoilType ?? null)
    if (unchanged) return setViewingSlot(null)
    await placeCardAt(viewingSlot.pageNumber, viewingSlot.slotNumber, { ...viewingSlot.card, variant, customFoilType })
    setViewingSlot(null)
  }

  async function handleRemoveViewingSlot() {
    if (!viewingSlot) return
    const ok = await runDb(
      () => removeCard(viewingSlot.pageNumber, viewingSlot.slotNumber),
      "Couldn't remove the card. Please try again.",
    )
    if (!ok) return
    setViewingSlot(null)
    await reloadPages()
  }

  function handleMenuSelect(key) {
    setMenuOpen(false)
    if (key === 'export') return handleExportCsv()
    if (key === 'import') return fileInputRef.current?.click()
    setOverlay(key)
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    try {
      setPendingImport({ slots: csvToSlots(await file.text()) })
    } catch (err) {
      setPendingImport({ error: err.message })
    }
  }

  async function handleConfirmImport() {
    setImporting(true)
    try {
      await importSlots(binderId, pendingImport.slots)
      setPendingImport(null)
      await reloadPages()
    } catch {
      setPendingImport({ error: "Couldn't import. Check your connection and try again." })
    }
    setImporting(false)
  }

  async function handleExportCsv() {
    const slots = await getAllBinderSlots(binderId)
    const url = URL.createObjectURL(new Blob([slotsToCsv(binderName, slots)], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${binderName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSelectCard(card) {
    setOverlay(null)
    if (activeSlot) await placeCardAt(activeSlot.pageNumber, activeSlot.slotNumber, card)
    else setPendingCard(card)
  }

  if (loading) return <LoadingScreen />
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-white" style={{ ...fontBase, ...pageBg }}>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div
      className="flex h-screen flex-col items-center gap-4 overflow-hidden p-4"
      style={{ ...fontBase, ...binderPageBg(backgroundUrl) }}
    >
      <div className="grid w-full shrink-0 grid-cols-3 items-center px-2">
        <div className="justify-self-start">
          <NavBtn onClick={() => supabase.auth.signOut()}>Log Out</NavBtn>
        </div>

        <span className="relative justify-self-center text-2xl font-semibold text-white">
          {binderName}
          {offlineReady && (
            <button
              type="button"
              onClick={() => setOverlay('offlineInfo')}
              className="absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap text-xs font-normal text-green-400"
              title="Every card in your collection is cached -- safe to go offline"
            >
              Offline ready
            </button>
          )}
        </span>

        {/* justify-self-end anchors this row's right edge to the column's right
            edge. The menu itself is position: fixed (flush to the viewport's
            top-right corner, not just this row), so it can never affect this
            row's height. To still get the "push Add Cards/More left" effect,
            an invisible same-sized stack of the menu buttons sits in normal
            flow reserving that width -- all stacked on the same grid cell so
            only the widest label's width (and one button's height) counts. */}
        <div className="flex flex-wrap items-center justify-end justify-self-end gap-1">
          <NavBtn onClick={() => setOverlay('search')}>Add Cards</NavBtn>
          <NavBtn onClick={() => setMenuOpen((open) => !open)}>More &#9662;</NavBtn>
          {/* Always mounted (not conditional on menuOpen) so grid-template-columns
              can transition both ways -- 0fr collapses it to zero width when
              closed, 1fr expands it to the invisible stack's natural width when
              open, animating "Add Cards"/"More" sliding left as it grows.
              0.2s ease-out matches .dropdown-menu-slide-in's timing (styles.css)
              so the push-left and the menu's slide-in overlap instead of one
              finishing before the other starts. */}
          <div
            className="grid"
            style={{ gridTemplateColumns: menuOpen ? '1fr' : '0fr', transition: 'grid-template-columns 0.2s ease-out' }}
          >
            <div className="overflow-hidden" style={{ minWidth: 0 }}>
              <div className="grid">
                {MENU_ITEMS.map(([label], i) => (
                  <NavBtn
                    key={i}
                    aria-hidden
                    tabIndex={-1}
                    style={{
                      gridArea: '1 / 1',
                      visibility: 'hidden',
                      pointerEvents: 'none',
                      padding: 'clamp(0.15rem, 0.7vh, 0.4rem) clamp(0.4rem, 1.8vh, 0.75rem)',
                      fontSize: 'clamp(0.75rem, 2.2vh, 1rem)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </NavBtn>
                ))}
              </div>
            </div>
          </div>
          {menuOpen && (
            <DropdownMenu
              onClose={() => setMenuOpen(false)}
              className="dropdown-menu-slide-in fixed right-0 top-0 flex flex-col items-end"
              style={{ gap: 'clamp(2px, 0.8vh, 8px)' }}
            >
              {MENU_ITEMS.map(([label, key, danger]) => (
                <NavBtn
                  key={key}
                  danger={danger}
                  onClick={() => handleMenuSelect(key)}
                  style={{
                    padding: 'clamp(0.15rem, 0.7vh, 0.4rem) clamp(0.4rem, 1.8vh, 0.75rem)',
                    fontSize: 'clamp(0.75rem, 2.2vh, 1rem)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </NavBtn>
              ))}
            </DropdownMenu>
          )}
        </div>
      </div>

      {actionError && (
        <p className="card-search-error shrink-0" role="alert">{actionError}</p>
      )}

      {pendingCard && (
        <CardBanner image={pendingCard.cardImage} onCancel={() => setPendingCard(null)}>
          Click a slot to place this card
        </CardBanner>
      )}

      {heldCard && (
        <CardBanner image={heldCard.card.cardImage} onCancel={() => setHeldCard(null)}>
          Tap a slot to place {heldCard.card.cardName ?? 'this card'} (or Cancel)
        </CardBanner>
      )}

      <div className="binder-scale-wrap" {...swipeHandlers}>
        <div id="binderView">
          <img src={notebookBg} alt="" className="binder-notebook-bg" aria-hidden="true" />
          <div className="binder-page-left">
            <BinderGrid
              pageNumber={activePage}
              slots={leftSlots}
              heldCard={heldCard}
              onSlotChoose={handleSlotChoose}
              onSlotView={handleSlotView}
            />
          </div>
          <div className="binder-page-right">
            <BinderGrid
              pageNumber={activePage + 1}
              slots={rightSlots}
              heldCard={heldCard}
              onSlotChoose={handleSlotChoose}
              onSlotView={handleSlotView}
            />
          </div>
        </div>
      </div>

      <PageNav activePage={activePage} setActivePage={setActivePage} lastPage={lastPage} />

      {(activeSlot || overlay === 'search') && (
        <CardSearchOverlay
          onSelect={handleSelectCard}
          onClose={() => {
            setActiveSlot(null)
            setOverlay(null)
          }}
        />
      )}

      {viewingSlot && (
        <CardDetailPopup
          cardId={viewingSlot.card.cardId}
          language={viewingSlot.card.language}
          ownedVariant={viewingSlot.card.variant}
          ownedFoilType={viewingSlot.card.customFoilType}
          onClose={() => setViewingSlot(null)}
          actions={[
            { label: 'Save Variant', onClick: handleChangeVariant, requiresVariantChoice: true },
            { label: 'Move', onClick: handleMoveViewingSlot },
            { label: 'Remove from Binder', onClick: handleRemoveViewingSlot, danger: true },
          ]}
        />
      )}

      {overlay === 'find' && (
        <FindInBinderOverlay
          onFind={findInBinder}
          onFindAll={findInAllBinders}
          onSelectResult={handleFindResultSelect}
          onClose={() => setOverlay(null)}
        />
      )}

      {overlay === 'switcher' && (
        <BinderSwitcherOverlay
          currentBinderId={binderId}
          listBinders={listBinders}
          onSwitch={handleSwitchBinder}
          onCreate={handleCreateBinder}
          onRename={renameBinder}
          onClose={() => setOverlay(null)}
        />
      )}

      {overlay === 'stats' && (
        <BinderStatsOverlay getCounts={getCounts} getWorth={getWorth} onClose={() => setOverlay(null)} />
      )}

      {overlay === 'share' && (
        <ShareOverlay getShareToken={getShareToken} setShareToken={setShareToken} onClose={() => setOverlay(null)} />
      )}

      {overlay === 'completion' && (
        <SetCompletionOverlay
          getCompletion={getCompletion}
          getSetCards={getSetCards}
          onClose={() => setOverlay(null)}
          onAddCard={(card) => {
            setOverlay(null)
            setPendingCard(card)
          }}
          onGoToPage={(pageNumber) => {
            setOverlay(null)
            setActivePage(spreadStartForPage(pageNumber))
          }}
        />
      )}

      {overlay === 'delete' && (
        <BinderDeleteOverlay
          listBinders={listBinders}
          onDelete={handleDeleteBinder}
          onClose={() => setOverlay(null)}
        />
      )}

      {overlay === 'offlineInfo' && <OfflineReadyOverlay onClose={() => setOverlay(null)} />}
      {overlay === 'buttonStyle' && <ButtonSkinPicker userId={userId} onClose={() => setOverlay(null)} />}
      {overlay === 'background' && (
        <BackgroundPicker
          userId={userId}
          binderId={binderId}
          onChanged={setBackgroundUrl}
          onClose={() => setOverlay(null)}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleImportFile}
        className="hidden"
      />

      {pendingImport && (
        <OverlayPanel onClose={() => setPendingImport(null)} panelStyle={{ minWidth: 280, maxWidth: 400 }}>
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
              <NavBtn onClick={handleConfirmImport} disabled={importing}>
                {importing ? '...' : 'Import'}
              </NavBtn>
            )}
            <NavBtn onClick={() => setPendingImport(null)}>{pendingImport.error ? 'Close' : 'Cancel'}</NavBtn>
          </div>
        </OverlayPanel>
      )}
    </div>
  )
}
