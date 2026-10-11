import { theme } from './theme'
import { FRAME } from './pixelArt'

const t = theme

export const fontBase = { fontFamily: t.font.family, letterSpacing: t.font.letterSpacing }

// Pixel-frame look shared by the login and username notebooks' inputs and
// buttons. borderWidth is in cqw so the frame scales with its card.
export const frameBox = (borderWidth) => ({
  ...fontBase,
  color: t.colors.inputText,
  backgroundColor: t.colors.inputCorner,
  borderStyle: 'solid',
  borderWidth,
  borderImageSource: FRAME,
  borderImageSlice: `${t.frame.slice} fill`,
  borderImageRepeat: 'stretch',
  imageRendering: 'pixelated',
  outline: 'none',
})
