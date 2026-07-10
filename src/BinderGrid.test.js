import { describe, it, expect } from 'vitest'
import { slotsByNumber } from './BinderGrid.jsx'

describe('slotsByNumber', () => {
  it('returns 9 nulls for an empty list', () => {
    expect(slotsByNumber([])).toEqual(Array(9).fill(null))
  })

  it('places each slot at its slot_number index', () => {
    const slots = [
      { slot_number: 2, card_id: 'a' },
      { slot_number: 0, card_id: 'b' },
    ]
    const result = slotsByNumber(slots)
    expect(result[0]).toEqual({ slot_number: 0, card_id: 'b' })
    expect(result[2]).toEqual({ slot_number: 2, card_id: 'a' })
    expect(result[1]).toBeNull()
  })

  it('ignores rows with an out-of-range slot_number', () => {
    const slots = [{ slot_number: 9, card_id: 'x' }, { slot_number: -1, card_id: 'y' }]
    expect(slotsByNumber(slots)).toEqual(Array(9).fill(null))
  })
})
