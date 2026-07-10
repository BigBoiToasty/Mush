import { useRef, useState, useEffect } from 'react'
import { holoEffectFor, getCardRarity } from './cards'

// Pointer physics adapted from simeydotme/pokemon-cards-css (GPL-3.0),
// https://github.com/simeydotme/pokemon-cards-css -- Card.svelte's
// `interact` handler. Re-implemented for a plain DOM ref instead of Svelte
// stores/springs (CSS `transition` on `@property`-registered custom
// properties stands in for the original's spring-physics smoothing). This
// project is GPL-3.0 licensed (see LICENSE) to keep this derivative legal.

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max)
}

function adjust(value, fromMin, fromMax, toMin, toMax) {
  return toMin + ((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin)
}

// Wraps any card image with the pointer-tracked 3D tilt; foil prints
// additionally get the rarity-appropriate shine + glare layers. Pass
// `rarity` when the caller already has it (detail popup); otherwise pass
// `cardId`/`language` and it's fetched from the session-cached tcgdex JSON
// (binder grid). Renders children untouched under prefers-reduced-motion.
export default function HoloTilt({ variant, rarity, cardId, language = 'en', children }) {
  const tiltRef = useRef(null)
  const [fetchedRarity, setFetchedRarity] = useState(null)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const needsFetch = rarity === undefined && !!cardId

  useEffect(() => {
    if (!needsFetch) return
    let cancelled = false
    getCardRarity(language, cardId).then((result) => {
      if (!cancelled) setFetchedRarity(result)
    })
    return () => { cancelled = true }
  }, [needsFetch, cardId, language])

  const holoEffect = holoEffectFor(variant, rarity !== undefined ? rarity : fetchedRarity)

  if (reducedMotion) return children

  function handlePointerMove(e) {
    const el = tiltRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percentX = clamp(((e.clientX - rect.left) / rect.width) * 100)
    const percentY = clamp(((e.clientY - rect.top) / rect.height) * 100)
    const centerX = percentX - 50
    const centerY = percentY - 50
    const fromCenter = clamp(Math.sqrt(centerX * centerX + centerY * centerY) / 50, 0, 1)

    el.style.setProperty('--pointer-x', `${percentX}%`)
    el.style.setProperty('--pointer-y', `${percentY}%`)
    el.style.setProperty('--rotate-x', `${-(centerX / 3.5)}deg`)
    el.style.setProperty('--rotate-y', `${centerY / 3.5}deg`)
    el.style.setProperty('--background-x', `${adjust(percentX, 0, 100, 37, 63)}%`)
    el.style.setProperty('--background-y', `${adjust(percentY, 0, 100, 33, 67)}%`)
    el.style.setProperty('--card-opacity', '1')
    el.style.setProperty('--pointer-from-center', `${fromCenter}`)
    el.style.setProperty('--pointer-from-left', `${percentX / 100}`)
    el.style.setProperty('--pointer-from-top', `${percentY / 100}`)
  }

  function handlePointerLeave() {
    const el = tiltRef.current
    if (!el) return
    el.style.setProperty('--pointer-x', '50%')
    el.style.setProperty('--pointer-y', '50%')
    el.style.setProperty('--rotate-x', '0deg')
    el.style.setProperty('--rotate-y', '0deg')
    el.style.setProperty('--background-x', '50%')
    el.style.setProperty('--background-y', '50%')
    el.style.setProperty('--card-opacity', '0')
    el.style.setProperty('--pointer-from-center', '0')
    el.style.setProperty('--pointer-from-left', '0.5')
    el.style.setProperty('--pointer-from-top', '0.5')
  }

  return (
    <div className="card-holo-translater">
      <div
        ref={tiltRef}
        className={`card-holo-rotator${holoEffect ? ` card-holo-rotator--${holoEffect}` : ''}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {children}
        {holoEffect && (
          <>
            <div className="card-holo-shine" />
            <div className="card-holo-glare" />
          </>
        )}
      </div>
    </div>
  )
}
