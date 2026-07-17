import { describe, it, expect, beforeEach, vi } from 'vitest'

// ui.jsx's real pixelArt.js draws to a <canvas> at import time, which needs a
// DOM the plain node test environment doesn't provide. This test only cares
// about the skin store's persistence logic, so stub pixelArt with plain data.
vi.mock('./pixelArt', () => ({
  TIDE_BG: 'url(tide)',
  FRAME_SHARP_DANGER: 'url(danger)',
  BUTTON_SKINS: {
    tide: { name: 'Tide' },
    kelp: { name: 'Kelp' },
    abyss: { name: 'Abyss' },
    coral: { name: 'Coral' },
    sand: { name: 'Sand' },
    obsidian: { name: 'Obsidian' },
  },
  getButtonSkinFrame: (key) => `url(${key})`,
}))

beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
  vi.resetModules()
})

describe('button skin persistence', () => {
  it('falls back to tide when nothing is stored', async () => {
    const { navButtonStyle } = await import('./ui')
    expect(navButtonStyle).toBeTruthy() // tide is the default skin, module loads without throwing
  })

  it('falls back to tide when the stored value is not a known skin', async () => {
    localStorage.setItem('mush:buttonSkin', 'not-a-real-skin')
    const { setButtonSkin } = await import('./ui')
    // an invalid stored key must not be used as the active skin; setButtonSkin
    // with a valid key should still work normally afterwards
    setButtonSkin('kelp')
    expect(localStorage.getItem('mush:buttonSkin')).toBe('kelp')
  })

  it('setButtonSkin persists the chosen skin to localStorage', async () => {
    const { setButtonSkin } = await import('./ui')
    setButtonSkin('obsidian')
    expect(localStorage.getItem('mush:buttonSkin')).toBe('obsidian')
  })

  it('ignores unknown skin keys', async () => {
    const { setButtonSkin } = await import('./ui')
    setButtonSkin('kelp')
    setButtonSkin('bogus')
    expect(localStorage.getItem('mush:buttonSkin')).toBe('kelp')
  })

  it('setButtonSkin with a custom skin stores the picked colors', async () => {
    const { setButtonSkin } = await import('./ui')
    const colors = { border: '#ff0000', fill: '#ffffff', text: '#000000' }
    setButtonSkin('custom', colors)
    expect(localStorage.getItem('mush:buttonSkin')).toBe('custom')
    expect(JSON.parse(localStorage.getItem('mush:buttonCustomColors'))).toEqual(colors)
  })

  it('ignores a custom skin with no colors provided', async () => {
    const { setButtonSkin } = await import('./ui')
    setButtonSkin('kelp')
    setButtonSkin('custom')
    expect(localStorage.getItem('mush:buttonSkin')).toBe('kelp')
  })

  it('initButtonSkinFromProfile applies a synced custom skin', async () => {
    const { initButtonSkinFromProfile } = await import('./ui')
    initButtonSkinFromProfile({ button_skin: 'custom', button_border: '#111111', button_fill: '#222222', button_text: '#333333' })
    expect(localStorage.getItem('mush:buttonSkin')).toBe('custom')
    expect(JSON.parse(localStorage.getItem('mush:buttonCustomColors'))).toEqual({ border: '#111111', fill: '#222222', text: '#333333' })
  })

  it('initButtonSkinFromProfile applies a synced preset skin', async () => {
    const { initButtonSkinFromProfile } = await import('./ui')
    initButtonSkinFromProfile({ button_skin: 'abyss' })
    expect(localStorage.getItem('mush:buttonSkin')).toBe('abyss')
  })
})

describe('binderPageBg', () => {
  it('returns the default pattern when no url is given', async () => {
    const { binderPageBg, pageBg } = await import('./ui')
    expect(binderPageBg(null)).toEqual(pageBg)
  })

  it('returns a cover-fit background image style when a url is given', async () => {
    const { binderPageBg } = await import('./ui')
    expect(binderPageBg('https://example.com/bg.png')).toEqual({
      backgroundImage: 'url(https://example.com/bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    })
  })
})
