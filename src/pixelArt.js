import { theme } from './theme'

// Low-res raster of concentric arcs (outer -> inner from theme.colors.pageBands)
// centered below the screen. Drawn tiny then upscaled with image-rendering:
// pixelated, so the curve comes out blocky instead of smooth. Shared by any
// full-page background that wants the app's retro "tide" look.
function pixelArc() {
  const w = 56, h = 36
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  const bands = theme.colors.pageBands
  const cx = w / 2, cy = h + 6
  const maxR = Math.hypot(cx, cy) + 4
  bands.forEach((col, i) => {
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(cx, cy, maxR * (1 - i / bands.length), 0, Math.PI * 2)
    ctx.fill()
  })
  return `url(${c.toDataURL()})`
}

export const TIDE_BG = pixelArc()

// Pixel-art input/button frame: draw tiny, upscale with image-rendering: pixelated.
// Concentric rounded rects outside in: black outline -> blue gradient rings -> fill.
// Used as a 9-slice border-image so corners stay crisp at any size. Shared by
// any control that wants the login card's pixel-frame button look.
// cornerLayers controls how many of the outer rings get the chamfered corner
// clip (theme.frame.cornerLayers by default, matching the login card); pass 0
// for plain square corners with no notch, e.g. for controls rendered at a
// small border-width where the notch would otherwise look like a stray
// white pixel instead of a chamfer.
function pixelFrame(cornerLayers = theme.frame.cornerLayers, borderColors = theme.colors.inputBorder, fillColor = theme.colors.inputFill) {
  const s = theme.frame.grid, r = theme.frame.radius
  const c = document.createElement('canvas')
  c.width = s; c.height = s
  const x = c.getContext('2d')
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
  const layers = [theme.colors.outline, ...borderColors, fillColor]
  layers.forEach((col, k) => {
    x.fillStyle = col
    rrect(k, k, s - 2 * k, s - 2 * k, k < cornerLayers ? r : 0)
  })
  return `url(${c.toDataURL()})`
}

export const FRAME = pixelFrame()
export const FRAME_SHARP = pixelFrame(0)
// Red variant for destructive actions (Delete Binder, Remove from Binder) --
// same pixel-frame look, red gradient + fill instead of the default blue.
export const FRAME_SHARP_DANGER = pixelFrame(0, ['#7a1e18', '#b3261e', '#e2867e'], '#f6d9d6')

// Button skins: alternate border/fill palettes for NavBtn, picked by the user
// in the style picker overlay. 'tide' matches the default login-card look;
// each other skin reuses pixelFrame() with its own gradient + fill + text
// color. Frames build lazily (on first getButtonSkinFrame call for a skin)
// since pixelFrame() touches the DOM canvas.
export const BUTTON_SKINS = {
  tide:     { name: 'Tide',     border: theme.colors.inputBorder,            fill: theme.colors.inputFill, text: theme.colors.inputText },
  kelp:     { name: 'Kelp',     border: ['#1c4a2e', '#2f7a4a', '#7fc99a'],    fill: '#cdf0da', text: '#0a2e17' },
  abyss:    { name: 'Abyss',    border: ['#081426', '#0f2c4a', '#3f6f9c'],    fill: '#d7e6f2', text: '#081426' },
  coral:    { name: 'Coral',    border: ['#7a3a1e', '#c96a3a', '#f0a878'],    fill: '#fbe4d2', text: '#4a2410' },
  sand:     { name: 'Sand',     border: ['#8a7752', '#c2ac7a', '#ecdcb6'],    fill: '#faf3e2', text: '#4a3f24' },
  obsidian: { name: 'Obsidian', border: ['#000000', '#2a2a2a', '#4a4a4a'],   fill: '#1a1a1a', text: '#e8e8e8' },
}

const skinFrameCache = {}
export function getButtonSkinFrame(skinKey) {
  const skin = BUTTON_SKINS[skinKey] || BUTTON_SKINS.tide
  if (!skinFrameCache[skinKey]) {
    skinFrameCache[skinKey] = pixelFrame(0, skin.border, skin.fill)
  }
  return skinFrameCache[skinKey]
}
