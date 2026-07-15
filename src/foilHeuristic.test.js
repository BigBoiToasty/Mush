import { describe, it, expect } from 'vitest'
import { guessFoilType } from './foilHeuristic'

describe('guessFoilType', () => {
  it('guesses classic starlight holo for Base Set era', () => {
    const card = { name: 'Charizard', rarity: 'Rare Holo', set: { id: 'base1' }, variants: { holo: true } }
    expect(guessFoilType(card).dataRarity).toBe('rare holo')
  })

  it('guesses cosmos for Team Rocket/Neo/Gym/literal-promo-substring era', () => {
    // "swsh-promo1" is a synthetic id exercising the literal .includes('promo')
    // rule as specified -- real TCGdex promo ids (e.g. "swshp") don't contain
    // that substring, see the NOTE in foilHeuristic.js.
    for (const setId of ['base4', 'base5', 'neo1', 'gym1', 'swsh-promo1']) {
      const card = { name: 'Mewtwo', rarity: 'Rare', set: { id: setId }, variants: { holo: true } }
      expect(guessFoilType(card).dataRarity).toBe('rare holo cosmos')
    }
  })

  it('guesses cosmos (no distinct galaxy effect) for EX/DP era', () => {
    const card = { name: 'Gardevoir', rarity: 'Rare', set: { id: 'ex1' }, variants: { holo: true } }
    expect(guessFoilType(card).dataRarity).toBe('rare holo cosmos')
  })

  it('detects VMAX/VSTAR subtypes from name', () => {
    expect(guessFoilType({ name: 'Charizard VMAX', set: {} }).dataSubtypes).toBe('vmax')
    expect(guessFoilType({ name: 'Arceus VSTAR', set: {} }).dataSubtypes).toBe('vstar')
    expect(guessFoilType({ name: 'Charizard V', set: {} }).dataSubtypes).toBe('v')
  })

  it('flags radiant and amazing rare from name/rarity text', () => {
    expect(guessFoilType({ name: 'Radiant Charizard', set: {} }).dataRarity).toBe('radiant rare')
    expect(guessFoilType({ name: 'Umbreon', rarity: 'Amazing Rare', set: {} }).dataRarity).toBe('amazing rare')
  })

  it('flags trainer gallery from rarity text independent of dataRarity', () => {
    const card = { name: 'Umbreon VMAX', rarity: 'Trainer Gallery Rare Holo V', set: {} }
    const result = guessFoilType(card)
    expect(result.dataTrainerGallery).toBe('true')
    expect(result.dataSubtypes).toBe('vmax')
  })

  it('uses ownedVariant to detect reverse holo over era guessing', () => {
    const card = { name: 'Pikachu', rarity: 'Rare', set: { id: 'base1' }, variants: { holo: true, reverse: true } }
    expect(guessFoilType(card, 'reverse').dataRarity).toBe('reverse holo')
  })

  it('does not assume reverse holo just because the variant exists alongside holo', () => {
    const card = { name: 'Pikachu', rarity: 'Rare', set: { id: 'base1' }, variants: { holo: true, reverse: true } }
    expect(guessFoilType(card).dataRarity).toBe('rare holo')
  })

  it('falls back to reverse holo when reverse is the only holo-like variant', () => {
    const card = { name: 'Pikachu', rarity: 'Common', set: { id: 'swsh1' }, variants: { reverse: true } }
    expect(guessFoilType(card).dataRarity).toBe('reverse holo')
  })

  it('maps Ultra Rare / Full Art rarity text to "rare ultra"', () => {
    expect(guessFoilType({ name: 'Zacian V', rarity: 'Ultra Rare', set: {} }).dataRarity).toBe('rare ultra')
    expect(guessFoilType({ name: 'Mega Sableye & Tyranitar GX', rarity: 'Ultra Rare', set: {} }).dataRarity).toBe('rare ultra')
  })

  it('maps Illustration Rare to the vstar effect, not the Trainer Gallery holo bar', () => {
    const card = { name: 'Garganacl', rarity: 'Illustration rare', set: { id: 'sv04' }, variants: { holo: true } }
    const result = guessFoilType(card)
    expect(result.dataRarity).toBe('rare holo vstar')
    expect(result.dataTrainerGallery).toBe('false')
  })

  it('maps Secret Rare to its own effect, not the Trainer Gallery flag', () => {
    const card = { name: 'Pikachu', rarity: 'Secret Rare', set: {} }
    const result = guessFoilType(card)
    expect(result.dataRarity).toBe('rare secret')
    expect(result.dataTrainerGallery).toBe('false')
  })

  it('classifies POP promo series as "loose" (wider clip) for the confirmed-undershooting template', () => {
    for (const setId of ['pop6', 'pop1', 'pop9']) {
      expect(guessFoilType({ name: 'Pikachu', rarity: 'Rare', set: { id: setId }, variants: { holo: true } }).clipEra).toBe('loose')
    }
  })

  it('keeps Base/Neo/Gym/EX/DP and real modern sets on the vendored default clip -- no evidence they need widening', () => {
    for (const setId of ['base1', 'neo1', 'gym1', 'ex1', 'dp1', 'swsh1', 'sv02', 'swshp', 'svp']) {
      expect(guessFoilType({ name: 'Mewtwo', rarity: 'Rare', set: { id: setId }, variants: { holo: true } }).clipEra).toBe('default')
    }
  })

  it('falls back to matte for a plain non-holo card', () => {
    const card = { name: 'Pidgey', rarity: 'Common', set: { id: 'base1' }, variants: {} }
    expect(guessFoilType(card).dataRarity).toBe('')
  })
})
