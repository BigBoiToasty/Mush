import { describe, it, expect } from 'vitest'
import { groupSlotsByPage, uniqueImageUrls } from './offlineSync'

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
