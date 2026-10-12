import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useBinder } from './useBinder'
import BinderSpread from './BinderSpread'
import MoreMenu from './MoreMenu'
import { useCsvTransfer, CsvImportPanel } from './CsvTransfer'
import { useSpreadNav } from './useSpreadNav'
import { thumbnailUrl } from './tcgdex'
import CardSearchOverlay from './CardSearchOverlay'
import CardDetailPopup from './CardDetailPopup'
import FindInBinderOverlay from './FindInBinderOverlay'
import BinderSwitcherOverlay from './BinderSwitcherOverlay'
import BinderStatsOverlay from './BinderStatsOverlay'
import BinderDeleteOverlay from './BinderDeleteOverlay'
import ShareOverlay from './ShareOverlay'
import SetCompletionOverlay from './SetCompletionOverlay'
import OfflineReadyOverlay from './OfflineReadyOverlay'
import BackgroundPicker from './BackgroundPicker'
import { fontBase, pageBg, binderPageBg, NavBtn, PageNav, ButtonSkinPicker, LoadingScreen } from './ui'
import { getBinderBackground, slotToCard } from './binderDb'
import { syncAllForOffline } from './offlineSync'
import { readSlots } from './offlineCache'
import { flushQueue } from './offlineQueue'
import './styles.css'

function CardBanner({ image, onCancel, children }) {
  return (
    <div className="flex shrink-0 items-center gap-2 text-white">
      <img src={thumbnailUrl(image)} alt="" className="h-10" />
      <span>{children}</span>
      <NavBtn onClick={onCancel}>Cancel</NavBtn>
    </div>
  )
}

export default function BinderPage({ userId }) {
  const {
    binderId, binderName, loading, error, fetchPage, placeCard, removeCard, moveCard, findInBinder, findInAllBinders,
    listBinders, switchBinder, createBinder, renameBinder, deleteBinder, getCounts, fetchLastPage, getWorth,
    getShareToken, setShareToken, getCompletion, getSetCards,
  } = useBinder(userId)
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
  const loadSeq = useRef(0)
  // Arrow keys flip pages on desktop, except while any overlay/menu is up
  // (Escape already belongs to those); flipping with a held/pending card
  // stays allowed -- that's how you carry a card to another page.
  const uiBusyRef = useRef(false)
  // Initial page survives a remount (alt-tab away/back can retrigger auth or
  // reload the backgrounded tab) so the user doesn't get bounced to page 1.
  const nav = useSpreadNav({
    initialPage: Number(sessionStorage.getItem('mush:activePage')) || 1,
    isBusy: () => uiBusyRef.current,
  })
  const { activePage, goToPage } = nav
  const activePageRef = useRef(activePage)
  activePageRef.current = activePage

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
    const [left, right, last] = await Promise.all([
      fetchPage(activePage),
      fetchPage(activePage + 1),
      fetchLastPage(), // keeps "Page X / Y" current after placements/removals
    ])
    if (seq !== loadSeq.current) return
    setLeftSlots(left)
    setRightSlots(right)
    setLastPage(last)
  }, [binderId, activePage, fetchPage, fetchLastPage])

  useEffect(() => {
    reloadPages()
  }, [reloadPages])

  const csv = useCsvTransfer(binderId, binderName, reloadPages)
  uiBusyRef.current = !!(overlay || activeSlot || viewingSlot || menuOpen || csv.busy)

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
    goToPage(1)
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
    goToPage(pageNumber)
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

  async function runMove(dest) {
    if (!heldCard) return
    const src = { page: heldCard.srcPage, slot: heldCard.srcSlot }
    if (src.page === dest.page && src.slot === dest.slot) return setHeldCard(null)
    const ok = await runDb(() => moveCard(src, dest), "Couldn't move the card. Please try again.")
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
    if (heldCard) return runMove({ page: pageNumber, slot: slotNumber })
    if (pendingCard) return placeCardAt(pageNumber, slotNumber, pendingCard)
    setActiveSlot({ pageNumber, slotNumber })
  }

  function handleSlotView(pageNumber, slotNumber, slot) {
    if (heldCard) return runMove({ page: pageNumber, slot: slotNumber })
    if (pendingCard) return placeCardAt(pageNumber, slotNumber, pendingCard)
    // slotToCard's variant is never undefined: undefined would flip
    // CardDetailPopup into add mode and show the variant picker.
    setViewingSlot({
      pageNumber,
      slotNumber,
      card: slotToCard(slot),
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
    if (key === 'export') return csv.exportCsv()
    if (key === 'import') return csv.pickFile()
    setOverlay(key)
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
              className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap text-xs font-normal text-green-400 sm:left-full sm:top-1/2 sm:ml-2 sm:-translate-y-1/2 sm:translate-x-0"
              title="Every card in your collection is cached -- safe to go offline"
            >
              Offline ready
            </button>
          )}
        </span>

        {/* justify-self-end anchors this row's right edge to the column's right edge */}
        <div className="flex flex-wrap items-center justify-end justify-self-end gap-1">
          <NavBtn onClick={() => setOverlay('search')}>Add Cards</NavBtn>
          <NavBtn onClick={() => setMenuOpen((open) => !open)}>More &#9662;</NavBtn>
          <MoreMenu open={menuOpen} onClose={() => setMenuOpen(false)} onSelect={handleMenuSelect} />
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

      <BinderSpread
        nav={nav}
        leftSlots={leftSlots}
        rightSlots={rightSlots}
        heldCard={heldCard}
        onSlotChoose={handleSlotChoose}
        onSlotView={handleSlotView}
      />

      <PageNav {...nav.pageNavProps(lastPage)} />

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
            goToPage(pageNumber)
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

      <CsvImportPanel {...csv.panelProps} />
    </div>
  )
}
