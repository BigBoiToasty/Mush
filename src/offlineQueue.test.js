import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enqueueOp, flushQueue } from './offlineQueue'
import { cacheSlots, readSlots, readQueue } from './offlineCache'
import { saveCards, deleteCard, moveCard } from './binderDb'

vi.mock('./binderDb', () => ({
  saveCards: vi.fn(),
  deleteCard: vi.fn(),
  moveCard: vi.fn(),
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

describe('enqueueOp move (offline mirror of move_card)', () => {
  const move = (src, dest) => ({ type: 'move', binder_id: 'b1', src, dest })
  const cards = (page) => Object.fromEntries((readSlots('b1', page) ?? []).map((s) => [s.slot_number, s.card_id]))

  it('moves a card to an empty slot on another page, keeping its fields', () => {
    cacheSlots('b1', 1, [{ page_number: 1, slot_number: 0, card_id: 'A', variant: 'holo' }])
    cacheSlots('b1', 3, [])
    enqueueOp(move({ page: 1, slot: 0 }, { page: 3, slot: 5 }))
    expect(cards(1)).toEqual({})
    expect(readSlots('b1', 3)).toEqual([{ page_number: 3, slot_number: 5, card_id: 'A', variant: 'holo' }])
  })

  it('swaps two cards across pages', () => {
    cacheSlots('b1', 1, [{ page_number: 1, slot_number: 0, card_id: 'A' }, { page_number: 1, slot_number: 1, card_id: 'K' }])
    cacheSlots('b1', 3, [{ page_number: 3, slot_number: 5, card_id: 'C' }])
    enqueueOp(move({ page: 1, slot: 0 }, { page: 3, slot: 5 }))
    expect(cards(1)).toEqual({ 0: 'C', 1: 'K' })
    expect(cards(3)).toEqual({ 5: 'A' })
  })

  it('swaps two cards on the same page', () => {
    cacheSlots('b1', 2, [{ page_number: 2, slot_number: 0, card_id: 'A' }, { page_number: 2, slot_number: 8, card_id: 'B' }])
    enqueueOp(move({ page: 2, slot: 0 }, { page: 2, slot: 8 }))
    expect(cards(2)).toEqual({ 0: 'B', 8: 'A' })
  })

  it('replays a queued move through moveCard', async () => {
    cacheSlots('b1', 1, [{ page_number: 1, slot_number: 0, card_id: 'A' }])
    enqueueOp(move({ page: 1, slot: 0 }, { page: 1, slot: 4 }))
    expect(await flushQueue()).toBe(1)
    expect(moveCard).toHaveBeenCalledWith('b1', { page: 1, slot: 0 }, { page: 1, slot: 4 })
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
