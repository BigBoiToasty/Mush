import { useState } from 'react'
import LoadingDots from './LoadingDots'

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
  const [loaded, setLoaded] = useState(false)
  return (
    <>
      {!loaded && <div className="loading-box"><LoadingDots /></div>}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ display: loaded ? undefined : 'none' }}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </>
  )
}
