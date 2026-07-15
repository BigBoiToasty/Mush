// Guesses the simeydotme/pokemon-cards-css holo attributes TCGdex can't tell
// us (specific foil pattern, subtype-driven effect) from card metadata --
// set era, name/suffix, and rarity text. `customFoilType` (the manual picker
// in CardDetailPopup) always wins when set; this is only the "Auto" fallback,
// upgraded from a flat card.rarity.toLowerCase() to actually guess eras.
//
// Two deviations from a literal implementation, both because the target CSS
// (public/css/cards/*.css, ported from the real library) doesn't support
// what a naive mapping would produce:
//  - "rare holo galaxy" isn't a real effect in the library -- only
//    cosmos-holo.css exists (data-rarity="rare holo cosmos"). EX/DP-era
//    cards guess to the same "rare holo cosmos" value as the Team Rocket/
//    Neo/Gym/promo era. Collectors use "cosmos" and "galaxy" informally for
//    similar-looking foils; the CSS only implements one of them.
//  - the trainer-gallery flag is `data-trainer-gallery`, not `data-gallery`
//    (see HoloCard.jsx) -- returned here as `dataTrainerGallery` so nothing
//    downstream has to remember to rename it.
export function guessFoilType(card, ownedVariant) {
  const name = card.name || ''
  const suffix = card.suffix || ''
  const stage = card.stage || ''
  const rarityText = card.rarity || ''
  const setId = (card.set?.id || '').toLowerCase()
  const nameAndSuffix = `${name} ${suffix}`

  // Rule A: special rarities & subtypes (modern) -- independent flags, not
  // a single cascade, since a card can be e.g. both VMAX and Trainer Gallery.
  let dataSubtypes = ''
  if (/vmax/i.test(nameAndSuffix)) dataSubtypes = 'vmax'
  else if (/vstar/i.test(nameAndSuffix)) dataSubtypes = 'vstar'
  else if (/\bV\b/.test(`${name} ${suffix} ${stage}`)) dataSubtypes = 'v'

  let dataRarity = ''
  if (/radiant/i.test(name)) dataRarity = 'radiant rare'
  else if (/amazing rare/i.test(rarityText)) dataRarity = 'amazing rare'
  // "Ultra Rare"/"Full Art" (TCGdex's actual rarity text for GX/V/EX full
  // arts) -> v-full-art.css / trainer-full-art.css's "rare ultra". Without
  // this, these fell through to Rule D's plain "rare holo" (or matte), which
  // reads as visibly wrong on a full-bleed layout: regular-holo's shine has
  // no clip-path override for anything but stage/supporter/item subtypes,
  // so it renders unclipped across art that was never designed for it.
  else if (/ultra rare|full art/i.test(rarityText)) dataRarity = 'rare ultra'
  // "Illustration Rare"/"Special Illustration Rare" (modern SV-era rarity)
  // has no distinct effect file in this library -- it predates SV. Maps to
  // v-star.css's look (the closest real match by request) rather than
  // falling through to Rule D's plain "rare holo", which combined with the
  // (former) trainer-gallery misclassification below rendered these with
  // trainer-gallery-holo.css's vertical foil-bar look -- visibly wrong for
  // a rarity that has nothing to do with the Trainer Gallery subset.
  else if (/illustration rare/i.test(rarityText)) dataRarity = 'rare holo vstar'
  // "Secret Rare" is its own rarity tier with its own effect file
  // (secret-rare.css) -- it isn't a Trainer Gallery card either, so this
  // sets dataRarity directly instead of just flagging dataTrainerGallery
  // the way the old combined regex did.
  else if (/secret/i.test(rarityText)) dataRarity = 'rare secret'

  // Only literal "Trainer Gallery" text means the Trainer Gallery subset
  // (data-trainer-gallery combines with V/VMAX/secret/holo dataRarity values
  // in trainer-gallery-*.css) -- "Illustration Rare" and "Secret Rare" are
  // unrelated rarities that used to get caught by an overly broad regex here.
  const dataTrainerGallery = /trainer gallery/i.test(rarityText) ? 'true' : 'false'

  // Rule C (explicit half): an ownedVariant of 'reverse' is real binder data,
  // not a guess -- it outranks Rule B's era inference below. Only the
  // implicit fallback (card.variants?.reverse with no ownedVariant info)
  // waits until after era guessing, since that signal is weaker.
  if (!dataRarity && ownedVariant === 'reverse') dataRarity = 'reverse holo'

  // Rule B: historical eras -- only for a plain standard holo, and only if
  // nothing above already pinned dataRarity.
  const isStandardHolo = card.variants?.holo === true || rarityText === 'Rare'
  if (!dataRarity && isStandardHolo) {
    if (setId === 'base1' || setId === 'base2' || setId === 'base3') {
      dataRarity = 'rare holo' // Base/Jungle/Fossil: classic starlight holo (Simon's default)
    } else if (
      setId === 'base4' ||
      setId === 'base5' ||
      setId.startsWith('neo') ||
      setId.startsWith('gym') ||
      setId.includes('promo')
    ) {
      // NOTE: real TCGdex promo set ids look like "swshp"/"smp" (era prefix
      // + trailing "p"), not literally containing "promo" -- ".includes"
      // is what was asked for, but verify against actual TCGdex ids since
      // this branch may rarely fire as written.
      dataRarity = 'rare holo cosmos' // Team Rocket..Neo, plus most promo sets
    } else if (setId.startsWith('ex') || setId.startsWith('dp')) {
      dataRarity = 'rare holo cosmos' // "galaxy" era -- no distinct CSS effect, reuses cosmos
    }
  }

  // Rule C (implicit fallback): no ownedVariant info, but reverse is the
  // only holo-like variant the card has -- it really is "rendered instead
  // of the standard holo", not just one of several options a differently-
  // owned print could be.
  if (!dataRarity && ownedVariant == null && card.variants?.reverse === true && card.variants?.holo !== true) {
    dataRarity = 'reverse holo'
  }

  // Rule D: fallback.
  if (!dataRarity && card.variants?.holo === true) dataRarity = 'rare holo'

  // clipEra: which --clip variable set (defaults.css) fits this card's art
  // window. Deliberately narrow and evidence-based rather than a broad "is
  // this an old set" guess: the only confirmed problem card is a POP promo
  // (pop6/Pikachu, 2007) undershooting the vendored --clip, and the only
  // confirmed-fine card is a real modern SV card (sv02/Sableye) that's
  // already correct with the vendored --clip unchanged. An earlier version
  // of this bucketed ALL of Base/Neo/Gym/EX/DP as "vintage" and widened
  // their clip too on the assumption they share POP's thin-border template
  // -- undoing that here, since there's no actual report that those are
  // broken (a live EX-era card, Salamence ex/ex16, already looked fine with
  // the vendored clip), and guessing wrong there risks a new regression
  // exactly like the one this fixes. Widen the bucket later if a specific
  // Base/Neo/Gym/EX/DP card turns out to need it, with its own evidence.
  // Only meaningful for the plain rare-holo/cosmos/reverse-holo family --
  // full-art/radiant/amazing/secret/vstar effects don't use this clip system.
  const clipEra = setId.startsWith('pop') ? 'loose' : 'default'

  return { dataRarity, dataSubtypes, dataTrainerGallery, clipEra }
}
