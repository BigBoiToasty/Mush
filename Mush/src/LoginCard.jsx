import cardImg from './assets/login-card.png'

// Notebook login card (Figma node 9:3). Scales to fit the viewport (capped)
// while keeping its 645:400 ratio; inner elements use percentages + cqw so the
// whole thing scales as one. RetroByte gives the Pokémon-game look.
const themed = { fontFamily: '"RetroByte"', letterSpacing: '0.12em' }

// Low-res raster of concentric arcs (blue outer -> green inner) centered below
// the screen. Drawn tiny then upscaled with image-rendering: pixelated, so the
// curve comes out blocky/stair-stepped instead of smooth. ponytail: built once
// at load; no need to redraw on resize since the browser scales the raster.
function pixelArc() {
  const w = 56, h = 36
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  const bands = ['#081c3a', '#0a2a55', '#0b3a5e', '#0a4258', '#09494e', '#0a5346', '#0a5038', '#0e4a26']
  const cx = w / 2, cy = h + 6
  const maxR = Math.hypot(cx, cy) + 4
  bands.forEach((col, i) => {            // outer (blue) first, greener bands on top
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(cx, cy, maxR * (1 - i / bands.length), 0, Math.PI * 2)
    ctx.fill()
  })
  return `url(${c.toDataURL()})`
}
const TIDE_BG = pixelArc()

// page = behind the card (solid color, gradient, or pixel-arc url), input =
// field fill, accent = focus ring.
// Labels/title stay black (they sit on the gray card art). ponytail: card is a
// PNG so we only theme the surfaces code controls — full recolor = new art.
const TIDE = { page: TIDE_BG, input: '#d6f5e3', accent: '#1f9e6b' }

export default function LoginCard() {
  const p = TIDE

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: p.page, backgroundSize: 'cover', imageRendering: 'pixelated', '--accent': p.accent }}
    >
      <div className="@container relative aspect-[645/400] w-[min(900px,92vw,calc(92vh*1.6125))]">
        <img
          src={cardImg}
          alt=""
          className="pointer-events-none absolute inset-0 size-full select-none"
        />

        <h2 style={themed} className="absolute left-1/2 top-[11%] -translate-x-1/2 text-black text-[4cqw]">
          Login
        </h2>

        <label style={themed} className="absolute left-[28%] top-[30%] text-black text-[2.2cqw]">
          Username
        </label>
        <input
          type="text"
          aria-label="Username"
          autoComplete="username"
          style={{ backgroundColor: p.input }}
          className="pixel-box absolute left-[28%] top-[37%] h-[13%] w-[44%] px-[2.2cqw] text-black text-[2.6cqw] outline-none"
        />

        <label style={themed} className="absolute left-[28%] top-[57%] text-black text-[2.2cqw]">
          Password
        </label>
        <input
          type="password"
          aria-label="Password"
          autoComplete="current-password"
          style={{ backgroundColor: p.input }}
          className="pixel-box absolute left-[28%] top-[64%] h-[13%] w-[44%] px-[2.2cqw] text-black text-[2.6cqw] outline-none"
        />
      </div>
    </div>
  )
}
