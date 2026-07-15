import { useEffect, useRef } from 'react'

function round(value, precision = 3) {
  return parseFloat(value.toFixed(precision))
}

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max)
}

function adjust(value, fromMin, fromMax, toMin, toMax) {
  return round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin))
}

// Pointer-tracking math ported from simeydotme/pokemon-cards-css's
// Card.svelte `interact()` (GPL-3.0, see /LICENSE) -- re-implemented against
// a plain element ref instead of Svelte spring stores. Sets every custom
// property base.css and the per-rarity effect files read: --pointer-x/-y
// position the glare/shine gradients, --rotate-x/-y drive the 3D tilt,
// --pointer-from-center/-top/-left feed the sunpillar/foil masks, and
// --background-x/-y + --card-opacity are what actually make v-max/cosmos/
// shiny-* backgrounds and the shine/glare layers visible (they default to
// 50%/0 in defaults.css, so skipping them silently no-ops every effect).
export function attachHoloPointer(el) {
  function handleMove(e) {
    const rect = el.getBoundingClientRect()
    const absolute = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const percent = {
      x: clamp(round((100 / rect.width) * absolute.x)),
      y: clamp(round((100 / rect.height) * absolute.y)),
    }
    const center = { x: percent.x - 50, y: percent.y - 50 }

    el.style.setProperty('--pointer-x', `${percent.x}%`)
    el.style.setProperty('--pointer-y', `${percent.y}%`)
    el.style.setProperty('--background-x', `${adjust(percent.x, 0, 100, 37, 63)}%`)
    el.style.setProperty('--background-y', `${adjust(percent.y, 0, 100, 33, 67)}%`)
    el.style.setProperty('--rotate-x', `${round(-(center.x / 3.5))}deg`)
    el.style.setProperty('--rotate-y', `${round(center.y / 3.5)}deg`)
    el.style.setProperty(
      '--pointer-from-center',
      `${clamp(Math.sqrt(center.y * center.y + center.x * center.x) / 50, 0, 1)}`,
    )
    el.style.setProperty('--pointer-from-top', `${percent.y / 100}`)
    el.style.setProperty('--pointer-from-left', `${percent.x / 100}`)
    el.style.setProperty('--card-opacity', '1')
    // The CSS ("pointer-transition.css") expects .interacting on the outer
    // .card element (`.card.interacting .card__rotator { transition: none }`)
    // -- el here is .card__rotator itself, so add it to the ancestor, not el.
    el.closest('.card')?.classList.add('interacting')
  }

  function handleLeave() {
    el.style.setProperty('--pointer-x', '50%')
    el.style.setProperty('--pointer-y', '50%')
    el.style.setProperty('--background-x', '50%')
    el.style.setProperty('--background-y', '50%')
    el.style.setProperty('--rotate-x', '0deg')
    el.style.setProperty('--rotate-y', '0deg')
    el.style.setProperty('--pointer-from-center', '0')
    el.style.setProperty('--pointer-from-top', '0.5')
    el.style.setProperty('--pointer-from-left', '0.5')
    el.style.setProperty('--card-opacity', '0')
    el.closest('.card')?.classList.remove('interacting')
  }

  el.addEventListener('pointermove', handleMove)
  el.addEventListener('pointerleave', handleLeave)
  // A click (e.g. opening the detail popup) doesn't move the pointer off the
  // card, so pointerleave never fires -- the tilt/glare/z-index boost from
  // .interacting would otherwise stick around, popping the binder card above
  // the popup overlay until the mouse is later dragged off it.
  el.addEventListener('click', handleLeave)

  return () => {
    el.removeEventListener('pointermove', handleMove)
    el.removeEventListener('pointerleave', handleLeave)
    el.removeEventListener('click', handleLeave)
  }
}

export function useHoloPointer() {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    return attachHoloPointer(ref.current)
  }, [])
  return ref
}
