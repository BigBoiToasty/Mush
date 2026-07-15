import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { theme } from './theme'
import { TIDE_BG, FRAME_SHARP_DANGER, BUTTON_SKINS, getButtonSkinFrame } from './pixelArt'

// Shared UI primitives: the pixel-frame button, the overlay panel scaffold,
// the binder page-spread navigator, and the load-on-mount hook every overlay
// uses. One module so the whole app reads as one UI.

const t = theme

export const fontBase = { fontFamily: t.font.family, letterSpacing: t.font.letterSpacing }
export const pageBg = { background: TIDE_BG, backgroundSize: 'cover', imageRendering: 'pixelated' }

// Active NavBtn skin, persisted so the choice survives reload. A tiny pub/sub
// store (not context) so NavBtn can read it without every call site needing
// a provider -- buttons are used from many independent overlay modules.
const SKIN_KEY = 'mush:buttonSkin'
let activeSkin = localStorage.getItem(SKIN_KEY) in BUTTON_SKINS ? localStorage.getItem(SKIN_KEY) : 'tide'
const skinListeners = new Set()

export function setButtonSkin(skinKey) {
  if (!(skinKey in BUTTON_SKINS)) return
  activeSkin = skinKey
  localStorage.setItem(SKIN_KEY, skinKey)
  skinListeners.forEach((fn) => fn())
}

function useButtonSkin() {
  return useSyncExternalStore(
    (onChange) => { skinListeners.add(onChange); return () => skinListeners.delete(onChange) },
    () => activeSkin,
  )
}

function skinButtonStyle(skinKey) {
  const skin = BUTTON_SKINS[skinKey] || BUTTON_SKINS.tide
  return {
    fontFamily: t.font.family,
    letterSpacing: t.font.letterSpacing,
    color: skin.text,
    backgroundColor: t.colors.inputCorner,
    borderStyle: 'solid',
    borderWidth: '8px',
    borderImageSource: getButtonSkinFrame(skinKey),
    borderImageSlice: `${t.frame.slice} fill`,
    borderImageRepeat: 'stretch',
    imageRendering: 'pixelated',
    outline: 'none',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.6)',
  }
}

// Kept for any external reader expecting the old static export -- reflects
// whatever skin is currently active.
export const navButtonStyle = skinButtonStyle(activeSkin)

export const navButtonClass =
  'nav-btn shrink-0 cursor-pointer font-semibold hover:brightness-95 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-40'

export const dangerButtonStyle = {
  ...navButtonStyle,
  color: '#5c0f0a',
  backgroundColor: '#f6d9d6',
  borderImageSource: FRAME_SHARP_DANGER,
}

export function NavBtn({ danger, style, skin, ...props }) {
  const activeSkin = useButtonSkin()
  const base = skin
    ? skinButtonStyle(skin)
    : danger
      ? { ...skinButtonStyle(activeSkin), color: '#5c0f0a', backgroundColor: '#f6d9d6', borderImageSource: FRAME_SHARP_DANGER }
      : skinButtonStyle(activeSkin)
  return (
    <button
      type="button"
      className={navButtonClass}
      style={{ ...base, ...style }}
      {...props}
    />
  )
}

// One row per skin in the style picker; each swatch renders as a real NavBtn
// forced into that skin, so the preview is exactly what picking it produces.
export function ButtonSkinPicker({ onClose }) {
  const activeSkin = useButtonSkin()
  return (
    <OverlayPanel title="Button Style" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {Object.entries(BUTTON_SKINS).map(([key, s]) => (
          <NavBtn
            key={key}
            skin={key}
            onClick={() => setButtonSkin(key)}
            style={key === activeSkin ? { boxShadow: '0 0 0 3px #ffffff, 0 3px 10px rgba(0,0,0,0.6)' } : undefined}
          >
            {s.name}{key === activeSkin ? ' (current)' : ''}
          </NavBtn>
        ))}
      </div>
    </OverlayPanel>
  )
}

// Overlays stack (e.g. card detail on top of search); Escape must only
// dismiss the topmost one, so each open overlay registers here in mount
// order and the handler ignores everything but the top of the stack.
const dismissStack = []

// Escape-key and backdrop-click dismissal for an overlay. Returns the click
// handler to put on the backdrop element (the target check ignores clicks
// that land on the panel or its contents).
export function useDismiss(onClose) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const entry = closeRef
    dismissStack.push(entry)
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissStack[dismissStack.length - 1] === entry) entry.current?.()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      dismissStack.splice(dismissStack.indexOf(entry), 1)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (e) => {
    if (e.target === e.currentTarget) closeRef.current?.()
  }
}

// A popout menu anchored to a button (e.g. the "More" menu) rather than a
// centered modal: an invisible full-screen click-catcher handles outside
// clicks (so it can still be dismissed from anywhere), while the dimmed
// "shadow" sits only behind its own content, not the whole page. Escape and
// clicking outside both call onClose, same as OverlayPanel. Positioning
// (absolute dropdown vs. inline in a flex row) is entirely up to `className`.
export function DropdownMenu({ onClose, className = '', style, children }) {
  const onBackdropClick = useDismiss(onClose)
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onBackdropClick} />
      <div
        className={`z-40 rounded p-2 ${className}`}
        style={{ background: 'rgba(0, 0, 0, 0.6)', ...style }}
      >
        {children}
      </div>
    </>
  )
}

// Standard overlay: dimmed backdrop, panel, optional title row with a Close
// button. Panels that need their own header (e.g. a confirm screen) omit
// `title` and render everything as children. Escape and backdrop clicks
// call onClose when one is given.
export function OverlayPanel({ title, onClose, panelStyle, children }) {
  const onBackdropClick = useDismiss(onClose)
  return (
    <div className="card-search-overlay" onClick={onBackdropClick}>
      <div className="card-search-bar flex flex-col gap-3" style={panelStyle}>
        {title && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-base font-semibold">{title}</span>
            <NavBtn onClick={onClose}>Close</NavBtn>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// Full-screen loading state -- pixel font on the tide background so even the
// wait reads as part of the app instead of a blank white flash.
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center text-white" style={{ ...fontBase, ...pageBg }}>
      <p>Loading...</p>
    </div>
  )
}

// Pages render as an odd/even spread (activePage / activePage + 1), so
// landing on an arbitrary target page means picking whichever spread
// actually contains it.
export function spreadStartForPage(pageNumber) {
  const clamped = Math.max(1, pageNumber)
  return clamped % 2 === 1 ? clamped : clamped - 1
}

// Swipe left/right on the binder flips to the next/previous spread -- the
// natural page-turn gesture on a phone. Only horizontal-dominant moves of
// 50px+ count, so vertical scrolls and taps on cards never flip pages.
export function usePageSwipe(setActivePage) {
  const start = useRef(null)
  return {
    onTouchStart: (e) => {
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    },
    onTouchEnd: (e) => {
      if (!start.current) return
      const dx = e.changedTouches[0].clientX - start.current.x
      const dy = e.changedTouches[0].clientY - start.current.y
      start.current = null
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
      setActivePage((p) => (dx < 0 ? p + 2 : Math.max(1, p - 2)))
    },
  }
}

// Prev / "Page N" (click to jump) / Next. Steps by 2 so activePage stays odd
// (left page of the spread), matching what spreadStartForPage produces.
// `lastPage` (highest page holding a card) shows the binder's extent as
// "Page 3 / 12" -- Next is never blocked, since growing the binder means
// paging past the end. Extra buttons render after Next.
export function PageNav({ activePage, setActivePage, lastPage, children }) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const displayedPage = (activePage + 1) / 2

  function stopEditing() {
    setEditing(false)
    setInput('')
  }

  function handleJump(e) {
    e.preventDefault()
    const target = Number(input)
    if (!Number.isInteger(target) || target < 1) return
    setActivePage(target * 2 - 1)
    stopEditing()
  }

  if (editing) {
    return (
      <form onSubmit={handleJump} className="flex shrink-0 items-center gap-4">
        <NavBtn onClick={stopEditing}>Back</NavBtn>
        <input
          type="number"
          min="1"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-20 rounded border border-gray-400 px-2 py-1 text-base"
        />
        <NavBtn type="submit">Go</NavBtn>
      </form>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-4">
      <NavBtn onClick={() => setActivePage((p) => Math.max(1, p - 2))} disabled={activePage <= 1}>
        Prev
      </NavBtn>
      <NavBtn onClick={() => { setInput(String(displayedPage)); setEditing(true) }}>
        Page {displayedPage}{lastPage ? ` / ${Math.max(displayedPage, Math.ceil(lastPage / 2))}` : ''}
      </NavBtn>
      <NavBtn onClick={() => setActivePage((p) => p + 2)}>Next</NavBtn>
      {children}
    </div>
  )
}

// Load-on-mount with cancellation. `data` stays null until the promise
// resolves; on failure `error` becomes the given message. Re-runs when `fn`
// changes, so pass a stable (useCallback'd) function.
export function useAsync(fn, errorMessage) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)
    fn()
      .then((result) => { if (!cancelled) setData(result) })
      .catch(() => { if (!cancelled) setError(errorMessage) })
    return () => { cancelled = true }
  }, [fn, errorMessage])

  return { data, error }
}
