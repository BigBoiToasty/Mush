import { describe, it, expect } from 'vitest'
import { planMove, cardUrl, hasCJK, pickByExactName, groupOwnedCardsBySet, annotateSetCards, holoEffectFor } from './cards'

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

describe('holoEffectFor', () => {
  it('maps the reverse variant to reverse regardless of rarity', () => {
    expect(holoEffectFor('reverse', 'Ultra Rare')).toBe('reverse')
    expect(holoEffectFor('reverse', null)).toBe('reverse')
  })

  it('picks the recipe by rarity for foil prints, even with a normal/null variant', () => {
    expect(holoEffectFor('normal', 'Ultra Rare')).toBe('v')
    expect(holoEffectFor(null, 'Rare Holo GX')).toBe('v')
    expect(holoEffectFor('holo', 'Holo Rare V')).toBe('v')
    expect(holoEffectFor('normal', 'Double rare')).toBe('v')
    expect(holoEffectFor('holo', 'Holo Rare VMAX')).toBe('vmax')
    expect(holoEffectFor('normal', 'Rare Rainbow')).toBe('rainbow')
    expect(holoEffectFor('normal', 'Secret Rare')).toBe('rainbow')
    expect(holoEffectFor('normal', 'Hyper rare')).toBe('rainbow')
  })

  it('gives classic holo rares and holo variants the vertical holo', () => {
    expect(holoEffectFor('holo', 'Rare')).toBe('holo')
    expect(holoEffectFor('holo', null)).toBe('holo')
    expect(holoEffectFor('normal', 'Rare Holo')).toBe('holo')
  })

  it('returns null for plain prints', () => {
    expect(holoEffectFor('normal', 'Common')).toBe(null)
    expect(holoEffectFor('firstEdition', 'Rare')).toBe(null)
    expect(holoEffectFor('wPromo', 'Uncommon')).toBe(null)
    expect(holoEffectFor(null, null)).toBe(null)
    expect(holoEffectFor(undefined, undefined)).toBe(null)
  })
})
