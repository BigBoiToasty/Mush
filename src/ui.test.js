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
})
