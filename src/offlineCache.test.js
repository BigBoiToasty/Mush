import { describe, it, expect, beforeEach } from 'vitest'
import { cacheSlots, readSlots, cacheBinders, readBinders, cacheProfile, readProfile } from './offlineCache'

beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
})

describe('offlineCache', () => {
  it('round-trips slots per binder+page', () => {
    const slots = [{ slot_number: 0, card_id: 'a' }]
    cacheSlots(7, 2, slots)
    expect(readSlots(7, 2)).toEqual(slots)
  })

  it('keeps pages separate', () => {
    cacheSlots(7, 1, [{ card_id: 'p1' }])
    cacheSlots(7, 2, [{ card_id: 'p2' }])
    expect(readSlots(7, 1)).toEqual([{ card_id: 'p1' }])
    expect(readSlots(7, 2)).toEqual([{ card_id: 'p2' }])
  })

  it('round-trips binders and profile', () => {
    cacheBinders('u1', [{ id: 1, name: 'A' }])
    cacheProfile('u1', { username: 'ash' })
    expect(readBinders('u1')).toEqual([{ id: 1, name: 'A' }])
    expect(readProfile('u1')).toEqual({ username: 'ash' })
  })

  it('returns null for a missing key', () => {
    expect(readSlots(99, 99)).toBeNull()
    expect(readBinders('nobody')).toBeNull()
  })
})
