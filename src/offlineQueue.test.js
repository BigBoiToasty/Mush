import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enqueueOp, flushQueue } from './offlineQueue'
import { cacheSlots, readSlots, readQueue } from './offlineCache'
import { saveCards, deleteCard } from './cards'

vi.mock('./cards', () => ({
  saveCards: vi.fn(),
  deleteCard: vi.fn(),
}))

beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
  vi.clearAllMocks()
})

const placeOp = (slotNumber, cardId) => ({
  type: 'place',
  slot: { binder_id: 'b1', page_number: 1, slot_number: slotNumber, card_id: cardId, card_image: `${cardId}.webp` },
})

describe('enqueueOp', () => {
  it('mirrors a queued place into the cached page, replacing that slot', () => {
    cacheSlots('b1', 1, [{ slot_number: 0, card_id: 'old' }, { slot_number: 1, card_id: 'keep' }])
    enqueueOp(placeOp(0, 'new'))
    const slots = readSlots('b1', 1)
    expect(slots.find((s) => s.slot_number === 0).card_id).toBe('new')
    expect(slots.find((s) => s.slot_number === 1).card_id).toBe('keep')
  })

  it('mirrors a queued remove into the cached page', () => {
    cacheSlots('b1', 2, [{ slot_number: 3, card_id: 'x' }])
    enqueueOp({ type: 'remove', binder_id: 'b1', page_number: 2, slot_number: 3 })
    expect(readSlots('b1', 2)).toEqual([])
  })
})

describe('flushQueue', () => {
  it('replays queued ops in order and drains the queue', async () => {
    enqueueOp(placeOp(0, 'a'))
    enqueueOp({ type: 'remove', binder_id: 'b1', page_number: 1, slot_number: 4 })
    expect(await flushQueue()).toBe(2)
    expect(saveCards).toHaveBeenCalledWith(placeOp(0, 'a').slot)
    expect(deleteCard).toHaveBeenCalledWith('b1', 1, 4)
    expect(readQueue()).toEqual([])
  })

  it('stops at the first failure and keeps the rest queued', async () => {
    enqueueOp(placeOp(0, 'a'))
    enqueueOp(placeOp(1, 'b'))
    saveCards.mockRejectedValueOnce(new Error('still offline'))
    expect(await flushQueue()).toBe(0)
    expect(readQueue()).toHaveLength(2)
    // next attempt succeeds and drains everything
    expect(await flushQueue()).toBe(2)
    expect(readQueue()).toEqual([])
  })

  it('is a no-op with nothing queued', async () => {
    expect(await flushQueue()).toBe(0)
    expect(saveCards).not.toHaveBeenCalled()
  })
})
