import { describe, it, expect, vi, beforeEach } from 'vitest'
import { groupSlotsByPage, uniqueImageUrls, syncAllForOffline } from './offlineSync'

vi.mock('./cards', () => ({
  getBinders: vi.fn(),
  getAllBinderSlots: vi.fn(),
}))
import { getBinders, getAllBinderSlots } from './cards'

describe('groupSlotsByPage', () => {
  it('groups slots by their page_number', () => {
    const slots = [
      { page_number: 1, slot_number: 0 },
      { page_number: 2, slot_number: 0 },
      { page_number: 1, slot_number: 1 },
    ]
    const byPage = groupSlotsByPage(slots)
    expect(byPage.get(1)).toHaveLength(2)
    expect(byPage.get(2)).toHaveLength(1)
  })
})

describe('uniqueImageUrls', () => {
  it('dedupes and drops missing images', () => {
    const slots = [
      { card_image: 'a.png' },
      { card_image: 'a.png' },
      { card_image: null },
      { card_image: 'b.png' },
    ]
    expect(uniqueImageUrls(slots)).toEqual(['a.png', 'b.png'])
  })
})

describe('syncAllForOffline priority ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve()))
  })

  it('fetches the priority spread at normal priority before the rest at low priority', async () => {
    getBinders.mockResolvedValue([{ id: 'b1' }])
    getAllBinderSlots.mockResolvedValue([
      { page_number: 1, slot_number: 0, card_image: 'page1.png' },
      { page_number: 3, slot_number: 0, card_image: 'page3.png' },
    ])

    await syncAllForOffline('user1', { binderId: 'b1', page: 1 })

    const calls = fetch.mock.calls
    expect(calls[0]).toEqual(['page1.png'])
    expect(calls[1]).toEqual(['page3.png', { priority: 'low' }])
  })

  it('processes the priority binder before other binders', async () => {
    getBinders.mockResolvedValue([{ id: 'other' }, { id: 'priority' }])
    getAllBinderSlots.mockImplementation((id) =>
      Promise.resolve([{ page_number: 1, slot_number: 0, card_image: `${id}.png` }]))

    await syncAllForOffline('user1', { binderId: 'priority', page: 1 })

    expect(getAllBinderSlots.mock.calls.map((c) => c[0])).toEqual(['priority', 'other'])
  })
})
