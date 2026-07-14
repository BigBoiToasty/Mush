import { describe, it, expect } from 'vitest'
import { planMove, cardUrl, hasCJK, pickByExactName, groupOwnedCardsBySet, annotateSetCards, slotsToCsv, csvToSlots } from './cards'

describe('hasCJK', () => {
  it('detects Japanese and Chinese text', () => {
    expect(hasCJK('ピカチュウ')).toBe(true) // katakana
    expect(hasCJK('喷火龙')).toBe(true) // simplified chinese
    expect(hasCJK('噴火龍')).toBe(true) // traditional chinese
  })

  it('is false for plain English', () => {
    expect(hasCJK('Pikachu')).toBe(false)
    expect(hasCJK('Charizard ex')).toBe(false)
  })
})

describe('pickByExactName', () => {
  it('prefers an exact case-insensitive name match over the first result', () => {
    const cards = [{ id: 'mewtwo-1', name: 'Mewtwo' }, { id: 'mew-1', name: 'Mew' }]
    expect(pickByExactName(cards, 'mew').id).toBe('mew-1')
  })

  it('falls back to the first result when nothing matches exactly', () => {
    const cards = [{ id: 'a', name: 'Charizard V' }, { id: 'b', name: 'Charizard ex' }]
    expect(pickByExactName(cards, 'Charizard').id).toBe('a')
  })

  it('returns undefined for an empty list', () => {
    expect(pickByExactName([], 'x')).toBeUndefined()
  })
})

describe('cardUrl', () => {
  it('uses an allowlisted language in the path', () => {
    expect(cardUrl('ja', 'SV2D-017')).toBe('https://api.tcgdex.net/v2/ja/cards/SV2D-017')
  })

  it('falls back to en for an unknown/injected language', () => {
    expect(cardUrl('../../evil', 'x')).toBe('https://api.tcgdex.net/v2/en/cards/x')
    expect(cardUrl(null, 'x')).toBe('https://api.tcgdex.net/v2/en/cards/x')
  })

  it('encodes the card id', () => {
    expect(cardUrl('en', 'a b')).toBe('https://api.tcgdex.net/v2/en/cards/a%20b')
  })
})

const held = { srcPage: 1, srcSlot: 0, card: { cardId: 'a', cardImage: 'a.png', variant: 'holo', cardName: 'A' } }

describe('planMove', () => {
  it('is a no-op when dropping on the origin slot', () => {
    expect(planMove({ page: 1, slot: 0 }, { page: 1, slot: 0 }, held, null)).toEqual([])
  })

  it('moves to an empty slot with place before remove', () => {
    const ops = planMove({ page: 1, slot: 0 }, { page: 3, slot: 5 }, held, null)
    expect(ops).toEqual([
      { type: 'place', page: 3, slot: 5, card: held.card },
      { type: 'remove', page: 1, slot: 0 },
    ])
  })

  it('swaps with an occupied slot using two places and no remove', () => {
    const destCard = { cardId: 'b', cardImage: 'b.png', variant: 'normal', cardName: 'B' }
    const ops = planMove({ page: 1, slot: 0 }, { page: 3, slot: 5 }, held, destCard)
    expect(ops).toEqual([
      { type: 'place', page: 3, slot: 5, card: held.card },
      { type: 'place', page: 1, slot: 0, card: destCard },
    ])
    expect(ops.some((op) => op.type === 'remove')).toBe(false)
  })
})

describe('groupOwnedCardsBySet', () => {
  it('groups owned cards into per-set summaries with counts', () => {
    const pairs = [
      { language: 'en', card_id: 'base1-4' },
      { language: 'en', card_id: 'base1-2' },
      { language: 'en', card_id: 'swsh1-1' },
    ]
    const cards = [
      { id: 'base1-4', set: { id: 'base1', name: 'Base', cardCount: { official: 102 } } },
      { id: 'base1-2', set: { id: 'base1', name: 'Base', cardCount: { official: 102 } } },
      { id: 'swsh1-1', set: { id: 'swsh1', name: 'Sword & Shield', cardCount: { official: 202 } } },
    ]
    const result = groupOwnedCardsBySet(pairs, cards)
    expect(result).toHaveLength(2)
    const base = result.find((s) => s.setId === 'base1')
    expect(base.ownedCount).toBe(2)
    expect(base.totalCount).toBe(102)
    expect(base.ownedCardIds.has('base1-4')).toBe(true)
    expect(base.ownedCardIds.has('base1-2')).toBe(true)
  })

  it('skips fetch failures (null) and cards with no set info', () => {
    const pairs = [{ language: 'en', card_id: 'a' }, { language: 'en', card_id: 'b' }]
    const cards = [null, { id: 'b', set: null }]
    expect(groupOwnedCardsBySet(pairs, cards)).toEqual([])
  })
})

describe('annotateSetCards', () => {
  it('flags owned cards with every binder page they appear on, missing cards with none', () => {
    const setCards = [{ id: 'base1-1', name: 'Alakazam' }, { id: 'base1-2', name: 'Blastoise' }]
    const ownedCardPages = new Map([['base1-1', [3, 7]]])
    expect(annotateSetCards(setCards, ownedCardPages)).toEqual([
      { id: 'base1-1', name: 'Alakazam', owned: true, pages: [3, 7] },
      { id: 'base1-2', name: 'Blastoise', owned: false, pages: [] },
    ])
  })
})

describe('slotsToCsv', () => {
  it('sorts by page then slot and includes a header row', () => {
    const slots = [
      { page_number: 2, slot_number: 0, card_id: 'b', card_name: 'Mew', variant: 'holo', language: 'en', card_image: 'b.webp' },
      { page_number: 1, slot_number: 4, card_id: 'a', card_name: 'Pikachu', variant: 'normal', language: 'ja', card_image: 'a.webp' },
    ]
    expect(slotsToCsv('My Binder', slots)).toBe(
      'binder,page,slot,card_id,card_name,variant,language,card_image\n' +
      'My Binder,1,4,a,Pikachu,normal,ja,a.webp\n' +
      'My Binder,2,0,b,Mew,holo,en,b.webp',
    )
  })

  it('quotes fields containing commas or quotes and blanks out nulls', () => {
    const slots = [
      { page_number: 1, slot_number: 0, card_id: 'x', card_name: 'Ho-oh, the "Rainbow"', variant: null, language: 'en', card_image: 'x.webp' },
    ]
    expect(slotsToCsv('a,b', slots)).toBe(
      'binder,page,slot,card_id,card_name,variant,language,card_image\n' +
      '"a,b",1,0,x,"Ho-oh, the ""Rainbow""",,en,x.webp',
    )
  })

  it('is header-only for an empty binder', () => {
    expect(slotsToCsv('Empty', [])).toBe('binder,page,slot,card_id,card_name,variant,language,card_image')
  })
})

describe('csvToSlots', () => {
  it('round-trips what slotsToCsv exports', () => {
    const slots = [
      { page_number: 1, slot_number: 4, card_id: 'a', card_name: 'Ho-oh, the "Rainbow"', variant: 'normal', language: 'ja', card_image: 'a.webp' },
      { page_number: 2, slot_number: 0, card_id: 'b', card_name: 'Mew', variant: null, language: 'en', card_image: 'b.webp' },
    ]
    expect(csvToSlots(slotsToCsv('My, "Binder"', slots))).toEqual(slots)
  })

  it('accepts CRLF line endings and a trailing newline', () => {
    const csv = 'binder,page,slot,card_id,card_name,variant,language,card_image\r\nB,1,0,x,Mew,,en,x.webp\r\n'
    expect(csvToSlots(csv)).toEqual([
      { page_number: 1, slot_number: 0, card_id: 'x', card_name: 'Mew', variant: null, language: 'en', card_image: 'x.webp' },
    ])
  })

  it('rejects files missing required columns', () => {
    expect(() => csvToSlots('name,qty\nMew,2')).toThrow(/Missing "page"/)
  })

  it('rejects rows with out-of-range pages or slots, naming the row', () => {
    const header = 'binder,page,slot,card_id,card_name,variant,language,card_image\n'
    expect(() => csvToSlots(header + 'B,0,0,x,Mew,,en,x.webp')).toThrow(/Row 2/)
    expect(() => csvToSlots(header + 'B,1,9,x,Mew,,en,x.webp')).toThrow(/Row 2/)
    expect(() => csvToSlots(header + 'B,1,0,,Mew,,en,x.webp')).toThrow(/Row 2/)
  })
})
