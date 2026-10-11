import { useCallback, useEffect, useRef, useState } from 'react'
import { spreadStartForPage, usePageSwipe, useSinglePageMode } from './ui'

// Page-turning state shared by the owner's binder and the public shared view.
// Pages load as an odd/even spread (activePage, activePage + 1). Portrait
// phones show one page at a time: `half` picks which page of the loaded
// spread is visible (0 = activePage, 1 = activePage + 1), so single-page
// flipping never changes what data gets fetched.
//
// isBusy() (optional) is checked before an arrow-key flip, so keys stay with
// whatever overlay or text field is open.
export function useSpreadNav({ initialPage = 1, isBusy } = {}) {
  const [activePage, setActivePage] = useState(initialPage)
  const [half, setHalf] = useState(0)
  const singlePage = useSinglePageMode()

  const stateRef = useRef({ activePage, half, singlePage })
  stateRef.current = { activePage, half, singlePage }
  const isBusyRef = useRef(isBusy)
  isBusyRef.current = isBusy

  const goToPage = useCallback((pageNumber) => {
    const page = Math.max(1, pageNumber)
    setActivePage(spreadStartForPage(page))
    setHalf(page % 2 === 0 ? 1 : 0)
  }, [])

  const flip = useCallback((dir) => {
    const { activePage: p, half: h, singlePage: single } = stateRef.current
    if (single) goToPage(p + h + dir)
    else setActivePage(dir > 0 ? p + 2 : Math.max(1, p - 2))
  }, [goToPage])

  const swipeHandlers = usePageSwipe(flip)

  useEffect(() => {
    const onKey = (e) => {
      if (isBusyRef.current?.() || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      if (e.key === 'ArrowRight') flip(1)
      else if (e.key === 'ArrowLeft') flip(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [flip])

  // Props for <PageNav>. In spread mode a "page" is a spread; `lastPage` is
  // the highest page holding a card (0 = unknown, so no total is shown).
  const pageNavProps = (lastPage = 0) => ({
    page: singlePage ? activePage + half : (activePage + 1) / 2,
    total: lastPage ? (singlePage ? lastPage : Math.ceil(lastPage / 2)) : null,
    onPrev: () => flip(-1),
    onNext: () => flip(1),
    prevDisabled: activePage <= 1 && (!singlePage || half === 0),
    onJump: (n) => (singlePage ? goToPage(n) : goToPage(n * 2 - 1)),
  })

  return { activePage, half, singlePage, goToPage, flip, swipeHandlers, pageNavProps }
}
