import { useState } from 'react'
import LoadingDots from './LoadingDots'

// Images already shown once this session: the same picture re-mounting
// (e.g. a binder card upgrading from plain image to holo card) appears at
// once instead of flashing the placeholder again.
const shown = new Set()

// Card image that shows a "Loading..." placeholder in place of the browser's
// default blank-then-half-drawn image while bytes are still streaming in,
// then cross-fades to the real <img> once it's decoded. onLoad/onError both
// count as "done" -- a broken image shouldn't loop forever.
//
// Deliberately its own file, not part of ui.jsx: ui.jsx eagerly draws a
// canvas at module load (pixelArt.js's TIDE_BG), which requires a DOM and
// breaks any test importing it in a non-jsdom environment. CardSlot.jsx
// (and its BinderGrid.jsx test) need this without pulling that in.
export default function FadeImg({ src, alt, className }) {
  const [loaded, setLoaded] = useState(() => shown.has(src))
  return (
    <>
      {!loaded && <div className="loading-box"><LoadingDots /></div>}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ display: loaded ? undefined : 'none' }}
        onLoad={() => { shown.add(src); setLoaded(true) }}
        onError={() => setLoaded(true)}
      />
    </>
  )
}
