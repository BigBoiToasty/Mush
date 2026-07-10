import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import { theme } from './theme'
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
import notebookBg from './assets/binder-notebook.png'
import { TIDE_BG } from './pixelArt'
import { navButtonClass, navButtonStyle, dangerButtonStyle } from './navButton'
import { planMove } from './cards'
import { syncAllForOffline } from './offlineSync'
import './styles.css'

const t = theme
const fontBase = { fontFamily: t.font.family, letterSpacing: t.font.letterSpacing }
const pageBg = { background: TIDE_BG, backgroundSize: 'cover', imageRendering: 'pixelated' }

// Pages render as an odd/even spread (activePage / activePage + 1), so
// landing on an arbitrary target page means picking whichever spread
// actually contains it.
function spreadStartForPage(pageNumber) {
  const clamped = Math.max(1, pageNumber)
  return clamped % 2 === 1 ? clamped : clamped - 1
}

export default function BinderPage({ userId }) {
  const {
    binderId, binderName, loading, error, fetchPage, placeCard, removeCard, findInBinder, findInAllBinders,
    listBinders, switchBinder, createBinder, deleteBinder, getCounts, getWorth,
    getShareToken, setShareToken, getCompletion, getSetCards,
  } = useBinder(userId)
  // Survives a remount (alt-tab away/back can retrigger auth or reload the
  // backgrounded tab) so the user doesn't get bounced back to page 1.
  const [activePage, setActivePage] = useState(() => Number(sessionStorage.getItem('mush:activePage')) || 1)
  const [leftSlots, setLeftSlots] = useState([])
  const [rightSlots, setRightSlots] = useState([])
  const [activeSlot, setActiveSlot] = useState(null) // { pageNumber, slotNumber } | null
  const [searchOpen, setSearchOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingPage, setEditingPage] = useState(false)
  const [pageJumpInput, setPageJumpInput] = useState('')
  const pageInputRef = useRef(null)
  const [pendingCard, setPendingCard] = useState(null) // card picked from top search, awaiting a slot
  const [viewingSlot, setViewingSlot] = useState(null) // { pageNumber, slotNumber, cardId, variant, cardImage, cardName } | null
  const [heldCard, setHeldCard] = useState(null) // { srcPage, srcSlot, card } | null, a card picked up to move
  const [actionError, setActionError] = useState(null)
  const loadSeq = useRef(0)

  const reloadPages = useCallback(async () => {
    if (!binderId) return
    // Sequence guard: a slower, older fetch pair must not overwrite the
    // slots of the page the user has since navigated to.
    const seq = ++loadSeq.current
    const [left, right] = await Promise.all([
      fetchPage(activePage),
      fetchPage(activePage + 1),
    ])
    if (seq !== loadSeq.current) return
    setLeftSlots(left)
    setRightSlots(right)
  }, [binderId, activePage, fetchPage])

  useEffect(() => {
    reloadPages()
  }, [reloadPages])

  useEffect(() => {
    sessionStorage.setItem('mush:activePage', String(activePage))
  }, [activePage])

  // Once per mount, when online, cache the whole collection for offline viewing.
  useEffect(() => {
    if (navigator.onLine) syncAllForOffline(userId)
  }, [userId])

  useEffect(() => {
    if (editingPage) pageInputRef.current?.focus()
  }, [editingPage])

  const displayedPage = (activePage + 1) / 2

  // Step by 2 so activePage stays odd (left page of the spread), matching
  // what spreadStartForPage produces for jumps and find results.
  function handlePrevPage() {
    setActivePage((p) => Math.max(1, p - 2))
  }

  function handleNextPage() {
    setActivePage((p) => p + 2)
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
    setFindOpen(false)
  }

  async function handleDeleteBinder(idToDelete) {
    await deleteBinder(idToDelete)
    if (idToDelete === binderId) {
      const remaining = await listBinders()
      if (remaining[0]) handleSwitchBinder(remaining[0].id, remaining[0].name)
    }
  }

  // A DB slot row uses snake_case; placeCard expects the camelCase card shape.
  function slotToCard(slot) {
    return {
      cardId: slot.card_id,
      cardImage: slot.card_image,
      variant: slot.variant,
      cardName: slot.card_name,
      language: slot.language,
    }
  }

  async function runMove(dest, destCard) {
    if (!heldCard) return
    const src = { page: heldCard.srcPage, slot: heldCard.srcSlot }
    const ops = planMove(src, dest, heldCard, destCard)
    setActionError(null)
    try {
      for (const op of ops) {
        if (op.type === 'place') await placeCard(op.page, op.slot, op.card)
        else await removeCard(op.page, op.slot)
      }
    } catch {
      // keep heldCard so the user can retry another slot
      setActionError("Couldn't move the card. Please try again.")
      return
    }
    setHeldCard(null)
    await reloadPages()
  }

  async function placeCardAt(pageNumber, slotNumber, card) {
    setActionError(null)
    try {
      await placeCard(pageNumber, slotNumber, card)
    } catch {
      // keep pendingCard so the user can retry another slot
      setActionError("Couldn't save the card. Please try again.")
      return
    }
    setPendingCard(null)
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
      cardId: slot.card_id,
      variant: slot.variant ?? null,
      cardImage: slot.card_image,
      cardName: slot.card_name,
      language: slot.language ?? 'en',
    })
  }

  function handleMoveViewingSlot() {
    if (!viewingSlot) return
    setHeldCard({
      srcPage: viewingSlot.pageNumber,
      srcSlot: viewingSlot.slotNumber,
      card: {
        cardId: viewingSlot.cardId,
        cardImage: viewingSlot.cardImage,
        variant: viewingSlot.variant,
        cardName: viewingSlot.cardName,
        language: viewingSlot.language,
      },
    })
    setViewingSlot(null)
  }

  async function handleRemoveViewingSlot() {
    if (!viewingSlot) return
    setActionError(null)
    try {
      await removeCard(viewingSlot.pageNumber, viewingSlot.slotNumber)
    } catch {
      setActionError("Couldn't remove the card. Please try again.")
      return
    }
    setViewingSlot(null)
    await reloadPages()
  }

  async function handleSelectCard(card) {
    setSearchOpen(false)
    if (activeSlot) {
      setActionError(null)
      try {
        await placeCard(activeSlot.pageNumber, activeSlot.slotNumber, card)
      } catch {
        setActionError("Couldn't save the card. Please try again.")
        return
      }
      setActiveSlot(null)
      await reloadPages()
    } else {
      setPendingCard(card)
    }
  }

  if (loading) return null
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
      style={{ ...fontBase, ...pageBg }}
    >
      <div className="grid w-full shrink-0 grid-cols-3 items-center px-2">
        <div className="justify-self-start">
          <button
            onClick={() => supabase.auth.signOut()}
            className={navButtonClass}
            style={navButtonStyle}
          >
            Log Out
          </button>
        </div>

        <span className="justify-self-center text-2xl font-semibold text-white">
          {binderName}
        </span>

        <div className="flex items-center justify-self-end gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={navButtonClass}
            style={navButtonStyle}
          >
            Search Cards
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className={navButtonClass}
              style={navButtonStyle}
            >
              More &#9662;
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setFindOpen(true) }}
                  className={navButtonClass}
                  style={navButtonStyle}
                >
                  Find in Binder
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setSwitcherOpen(true) }}
                  className={navButtonClass}
                  style={navButtonStyle}
                >
                  Binders
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setStatsOpen(true) }}
                  className={navButtonClass}
                  style={navButtonStyle}
                >
                  Binder Info
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setShareOpen(true) }}
                  className={navButtonClass}
                  style={navButtonStyle}
                >
                  Share Binder
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setCompletionOpen(true) }}
                  className={navButtonClass}
                  style={navButtonStyle}
                >
                  Set Completion
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setDeleteOpen(true) }}
                  className={navButtonClass}
                  style={dangerButtonStyle}
                >
                  Delete Binder
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {actionError && (
        <p className="card-search-error shrink-0" role="alert">{actionError}</p>
      )}

      {pendingCard && (
        <div className="flex shrink-0 items-center gap-2 text-white">
          <img src={pendingCard.cardImage} alt="" className="h-10" />
          <span>Click a slot to place this card</span>
          <button type="button" onClick={() => setPendingCard(null)} className={navButtonClass} style={navButtonStyle}>
            Cancel
          </button>
        </div>
      )}

      {heldCard && (
        <div className="flex shrink-0 items-center gap-2 text-white">
          <img src={heldCard.card.cardImage} alt="" className="h-10" />
          <span>Tap a slot to place {heldCard.card.cardName ?? 'this card'} (or Cancel)</span>
          <button type="button" onClick={() => setHeldCard(null)} className={navButtonClass} style={navButtonStyle}>
            Cancel
          </button>
        </div>
      )}

      <div className="binder-scale-wrap">
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

      {editingPage ? (
        <form onSubmit={handlePageJump} className="flex shrink-0 items-center gap-4">
          <button type="button" onClick={handleCancelEditPage} className={navButtonClass} style={navButtonStyle}>
            Back
          </button>
          <input
            ref={pageInputRef}
            type="number"
            min="1"
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
            onClick={handlePrevPage}
            disabled={activePage <= 1}
            className={navButtonClass}
            style={navButtonStyle}
          >
            Prev
          </button>
          <button type="button" onClick={handleStartEditPage} className={navButtonClass} style={navButtonStyle}>
            Page {displayedPage}
          </button>
          <button type="button" onClick={handleNextPage} className={navButtonClass} style={navButtonStyle}>
            Next
          </button>
        </div>
      )}

      {(activeSlot || searchOpen) && (
        <CardSearchOverlay
          onSelect={handleSelectCard}
          onClose={() => {
            setActiveSlot(null)
            setSearchOpen(false)
          }}
        />
      )}

      {viewingSlot && (
        <CardDetailPopup
          cardId={viewingSlot.cardId}
          language={viewingSlot.language}
          ownedVariant={viewingSlot.variant}
          onClose={() => setViewingSlot(null)}
          actions={[
            { label: 'Move', onClick: handleMoveViewingSlot },
            { label: 'Remove from Binder', onClick: handleRemoveViewingSlot, danger: true },
          ]}
        />
      )}

      {findOpen && (
        <FindInBinderOverlay
          onFind={findInBinder}
          onFindAll={findInAllBinders}
          onSelectResult={handleFindResultSelect}
          onClose={() => setFindOpen(false)}
        />
      )}

      {switcherOpen && (
        <BinderSwitcherOverlay
          currentBinderId={binderId}
          listBinders={listBinders}
          onSwitch={handleSwitchBinder}
          onCreate={handleCreateBinder}
          onClose={() => setSwitcherOpen(false)}
        />
      )}

      {statsOpen && (
        <BinderStatsOverlay getCounts={getCounts} getWorth={getWorth} onClose={() => setStatsOpen(false)} />
      )}

      {shareOpen && (
        <ShareOverlay getShareToken={getShareToken} setShareToken={setShareToken} onClose={() => setShareOpen(false)} />
      )}

      {completionOpen && (
        <SetCompletionOverlay
          getCompletion={getCompletion}
          getSetCards={getSetCards}
          onClose={() => setCompletionOpen(false)}
          onAddCard={(card) => {
            setCompletionOpen(false)
            setPendingCard(card)
          }}
          onGoToPage={(pageNumber) => {
            setCompletionOpen(false)
            setActivePage(pageNumber % 2 === 1 ? pageNumber : pageNumber - 1)
          }}
        />
      )}

      {deleteOpen && (
        <BinderDeleteOverlay
          listBinders={listBinders}
          onDelete={handleDeleteBinder}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </div>
  )
}
