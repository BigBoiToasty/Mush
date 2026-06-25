import { useState } from 'react'
import cardImg from './assets/login-card.png'
import sableyeShow from './assets/sableye-show.png' // eyes open -> password shown
import sableyeHide from './assets/sableye-hide.png' // covering eyes -> password hidden
import googleG from './assets/google-g.png'
import { theme } from './theme'

// Notebook login card (Figma node 48:7). Scales to fit the viewport (capped)
// while keeping its 645:400 ratio; inner elements use percentages + cqw so the
// whole thing scales as one. ALL tweakable values live in theme.js — edit there.
const t = theme
const fontBase = { fontFamily: t.font.family, letterSpacing: t.font.letterSpacing }

// Low-res raster of concentric arcs (outer -> inner from theme.colors.pageBands)
// centered below the screen. Drawn tiny then upscaled with image-rendering:
// pixelated, so the curve comes out blocky instead of smooth. ponytail: built
// once at load; the browser scales the raster on resize.
function pixelArc() {
  const w = 56, h = 36
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  const bands = t.colors.pageBands
  const cx = w / 2, cy = h + 6
  const maxR = Math.hypot(cx, cy) + 4
  bands.forEach((col, i) => {            // outer first, inner bands on top
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(cx, cy, maxR * (1 - i / bands.length), 0, Math.PI * 2)
    ctx.fill()
  })
  return `url(${c.toDataURL()})`
}
const TIDE_BG = pixelArc()

// Pixel-art input frame: same blocky technique as pixelArc (draw tiny, upscale
// with image-rendering: pixelated). Concentric rounded rects, outside in: the
// black outline -> blue rings stepping darker->lighter (faux gradient) -> fill.
// All colors/sizes come from theme.colors + theme.frame. Used as a 9-slice
// border-image so the rounded corners stay crisp at any input size.
function pixelFrame() {
  const s = t.frame.grid, r = t.frame.radius
  const c = document.createElement('canvas')
  c.width = s; c.height = s
  const x = c.getContext('2d')
  // Crisp pixel "rounded" rect: fill row-by-row with a stepped (45°) corner.
  // Using fillRect on integer coords avoids the anti-aliased gray fringe that
  // roundRect leaves in the corners.
  const rrect = (X, Y, W, H, R) => {
    R = Math.max(0, Math.min(R, Math.floor(Math.min(W, H) / 2)))
    for (let row = 0; row < H; row++) {
      let cut = 0
      if (row < R) cut = R - 1 - row
      else if (row >= H - R) cut = R - 1 - (H - 1 - row)
      cut = Math.max(0, cut)
      x.fillRect(X + cut, Y + row, W - 2 * cut, 1)
    }
  }
  const black = t.colors.outline
  const blues = t.colors.inputBorder
  const fill = t.colors.inputFill
  // Draw outside in: black outline, gradient rings, then fill. Only the outer
  // `cornerLayers` rings get the clipped corner; inner rings + fill stay square
  // so the interior reads as a clean rectangle (not an oval).
  const layers = [black, ...blues, fill]
  layers.forEach((col, k) => {
    x.fillStyle = col
    rrect(k, k, s - 2 * k, s - 2 * k, k < t.frame.cornerLayers ? r : 0)
  })
  return `url(${c.toDataURL()})`
}
const FRAME = pixelFrame()

// Shared pixel-frame look (the border-image box). Both the inputs and the
// buttons spread this so they have identical structure — RetroByte font, the
// black-outline + blue-gradient + fill frame, dark text.
const frameBox = {
  ...fontBase,
  color: t.colors.inputText,
  backgroundColor: t.colors.inputCorner, // fills the transparent corners
  borderStyle: 'solid',
  borderWidth: t.frame.width,
  borderImageSource: FRAME,
  borderImageSlice: `${t.frame.slice} fill`,
  borderImageRepeat: 'stretch',
  imageRendering: 'pixelated',
  outline: 'none',
}

const pixelInput = {
  ...frameBox,
  fontSize: t.font.input,
  paddingLeft: t.layout.inputPadX,
  paddingRight: t.layout.inputPadX,
  width: t.layout.fieldW,
  height: t.layout.fieldH,
}

const labelStyle = (top) => ({ ...fontBase, color: t.colors.label, fontSize: t.font.label, left: t.layout.fieldX, top })

const btnStyle = (pos) => ({
  ...frameBox,
  position: 'absolute',
  fontSize: pos.font || t.font.button,
  paddingLeft: pos.pad || t.layout.buttonPadX,   // pos.pad = uniform override (used by Google)
  paddingRight: pos.pad || t.layout.buttonPadX,
  paddingTop: pos.pad || t.layout.buttonPadY,
  paddingBottom: pos.pad || t.layout.buttonPadY,
  left: pos.right ? undefined : pos.left, // anchor by right edge when `right` is set
  right: pos.right,
  top: pos.top,
  // matchInput: lock the button to the input-box height and center its content
  ...(pos.matchInput && {
    height: t.layout.fieldH,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
})
const btnCls = 'absolute cursor-pointer leading-none hover:brightness-110'

export default function LoginCard() {
  const [showPw, setShowPw] = useState(false)

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: TIDE_BG, backgroundSize: 'cover', imageRendering: 'pixelated' }}
    >
      <div className="@container relative aspect-[645/400] w-[min(900px,92vw,calc(92vh*1.6125))]">
        <img
          src={cardImg}
          alt=""
          className="pointer-events-none absolute inset-0 size-full select-none"
        />

        <h2
          style={{ ...fontBase, color: t.colors.label, fontSize: t.font.title, top: t.layout.titleTop }}
          className="absolute left-1/2 -translate-x-1/2"
        >
          Login
        </h2>

        <label style={labelStyle(t.layout.usernameLabelTop)} className="absolute">
          Username
        </label>
        <input
          type="text"
          aria-label="Username"
          autoComplete="username"
          style={{ ...pixelInput, left: t.layout.fieldX, top: t.layout.usernameTop }}
          className="absolute"
        />

        <label style={labelStyle(t.layout.passwordLabelTop)} className="absolute">
          Password
        </label>
        <input
          type={showPw ? 'text' : 'password'}
          aria-label="Password"
          autoComplete="current-password"
          style={{ ...pixelInput, left: t.layout.fieldX, top: t.layout.passwordTop, paddingRight: '8%' }}
          className="absolute"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          aria-label={showPw ? 'Hide password' : 'Show password'}
          aria-pressed={showPw}
          title={showPw ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            left: `calc(${t.layout.fieldX} + ${t.layout.fieldW} - 6%)`,
            top: `calc(${t.layout.passwordTop} + ${t.layout.fieldH} / 2)`,
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 0,
          }}
        >
          <img
            src={showPw ? sableyeShow : sableyeHide}
            alt=""
            style={{ width: t.layout.pwToggleSize, height: 'auto', display: 'block', imageRendering: 'pixelated' }}
          />
        </button>

        {/* Buttons are placeholders — wire to supabaseClient when auth is built. */}
        <button type="button" style={btnStyle(t.layout.buttons.google)} className={btnCls}>
          <img
            src={googleG}
            alt="Google"
            style={{ height: t.layout.googleIconSize, width: 'auto', display: 'block', imageRendering: 'pixelated' }}
          />
        </button>
        <button type="button" style={btnStyle(t.layout.buttons.signup)} className={btnCls}>
          Sign Up →
        </button>
        <button type="submit" style={btnStyle(t.layout.buttons.login)} className={btnCls}>
          Login
        </button>
        <button type="button" style={btnStyle(t.layout.buttons.forgot)} className={btnCls}>
          Forgot Password
        </button>
      </div>
    </div>
  )
}
