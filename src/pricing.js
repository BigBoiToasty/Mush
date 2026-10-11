// TCGplayer prices, as reported inside each TCGdex card.

// card.variants uses tcgdex's own vocabulary (normal/holo/reverse/
// firstEdition/wPromo); card.pricing.tcgplayer uses TCGplayer's own SKU
// names, which don't match ("holo" -> "holofoil", "reverse" ->
// "reverse-holofoil", etc -- confirmed against the live API). Without this
// map, `variants[variant]` silently misses and falls back to the wrong
// price whenever the selected variant isn't literally "normal".
const TCGPLAYER_KEYS_BY_VARIANT = {
  normal: ['normal'],
  holo: ['holofoil', 'unlimited-holofoil'],
  reverse: ['reverse-holofoil'],
  firstEdition: ['1st-edition-holofoil', '1st-edition-normal'],
  wPromo: ['normal'],
}

// Finds the TCGplayer pricing entry to show/use: the owned/selected
// variant's when priced, else any priced variant. Returns [variantKey, entry].
export function pickTcgplayerEntry(tcgplayer, variant) {
  if (!tcgplayer) return undefined
  const { updated, ...variants } = tcgplayer
  for (const key of TCGPLAYER_KEYS_BY_VARIANT[variant] ?? []) {
    if (variants[key]?.marketPrice != null) return [key, variants[key]]
  }
  return Object.entries(variants).find(([, v]) => v?.marketPrice != null)
}

// Picks one number to represent a card's value: the owned variant's
// TCGplayer market price when available, else any priced TCGplayer
// variant, else null (no Cardmarket fallback -- TCGplayer only, by request).
export function extractCardPrice(card, variant) {
  const entry = pickTcgplayerEntry(card.pricing?.tcgplayer, variant)
  return entry ? entry[1].marketPrice : null
}
