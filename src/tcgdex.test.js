import { describe, it, expect, vi, beforeEach } from 'vitest'

// Fresh module per test: the card cache and request queue are module state.
let tcgdex
beforeEach(async () => {
  vi.resetModules()
  globalThis.fetch = vi.fn()
  tcgdex = await import('./tcgdex')
})

const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

describe('fetchCard', () => {
  it('shares one request between callers asking for the same card at once', async () => {
    fetch.mockReturnValue(ok({ id: 'a' }))
    const [x, y] = await Promise.all([tcgdex.fetchCard('en', 'a'), tcgdex.fetchCard('en', 'a')])
    expect(x).toEqual({ id: 'a' })
    expect(y).toBe(x)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('serves a fetched card from memory afterwards', async () => {
    fetch.mockReturnValue(ok({ id: 'a' }))
    await tcgdex.fetchCard('en', 'a')
    expect(tcgdex.peekCard('en', 'a')).toEqual({ id: 'a' })
    await tcgdex.fetchCard('en', 'a')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('does not remember failures', async () => {
    fetch.mockRejectedValueOnce(new Error('offline')).mockReturnValue(ok({ id: 'a' }))
    expect(await tcgdex.fetchCard('en', 'a')).toBeNull()
    expect(tcgdex.peekCard('en', 'a')).toBeUndefined()
    expect(await tcgdex.fetchCard('en', 'a')).toEqual({ id: 'a' })
  })

  it('runs at most 6 requests at a time', async () => {
    let running = 0
    let peak = 0
    fetch.mockImplementation(async () => {
      running++
      peak = Math.max(peak, running)
      await new Promise((r) => setTimeout(r, 5))
      running--
      return { ok: true, json: async () => ({}) }
    })
    await Promise.all(Array.from({ length: 20 }, (_, i) => tcgdex.fetchCard('en', `c${i}`)))
    expect(fetch).toHaveBeenCalledTimes(20)
    expect(peak).toBe(6)
  })
})
