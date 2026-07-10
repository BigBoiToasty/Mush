// Shared pixel-frame button style used by BinderPage's nav/corner buttons
// and CardSearchOverlay's search/cancel buttons, so they read as one UI.
import { theme } from './theme'
import { FRAME_SHARP, FRAME_SHARP_DANGER } from './pixelArt'

const t = theme

export const navButtonStyle = {
  fontFamily: t.font.family,
  letterSpacing: t.font.letterSpacing,
  color: t.colors.inputText,
  backgroundColor: t.colors.inputCorner,
  borderStyle: 'solid',
  borderWidth: '8px',
  borderImageSource: FRAME_SHARP,
  borderImageSlice: `${t.frame.slice} fill`,
  borderImageRepeat: 'stretch',
  imageRendering: 'pixelated',
  outline: 'none',
  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.6)',
}

export const navButtonClass =
  'shrink-0 cursor-pointer px-4 py-2 text-base font-semibold hover:brightness-95 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-40'

export const dangerButtonStyle = {
  ...navButtonStyle,
  color: '#5c0f0a',
  backgroundColor: '#f6d9d6',
  borderImageSource: FRAME_SHARP_DANGER,
}
