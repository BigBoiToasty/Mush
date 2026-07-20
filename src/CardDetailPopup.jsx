import { useState, useEffect } from 'react'
import { NavBtn, useDismiss } from './ui'
import { pickTcgplayerEntry } from './cards'
import { useCardData } from './useCardData'
import HoloCard from './HoloCard'

const VARIANT_LABELS = { firstEdition: '1st Edition', holo: 'Holo', reverse: 'Reverse Holo', normal: 'Normal', wPromo: 'Promo Stamp' }
const VARIANT_ORDER = ['normal', 'holo', 'reverse', 'firstEdition', 'wPromo']

// Values are the literal `data-rarity` strings simeydotme/pokemon-cards-css
// selects on (see public/css/cards/*.css) -- TCGdex doesn't track these foil
// patterns, so this lets you pick one by hand. Left blank ("Auto"),
// HoloCard falls back to guessFoilType() and then card.rarity.toLowerCase().
// NOTE: the library has no distinct "galaxy" effect -- galaxy.jpg/-source.png
// ship in the reference repo but no CSS file references them. "Galaxy Holo"
// reuses the Cosmos effect (cosmos-holo.css) since collectors use the terms
// interchangeably and it's the closest real match.
const FOIL_TYPE_OPTIONS = [
  { key: 'auto', value: '', label: 'Auto (from card rarity)' },
  { key: 'holo', value: 'rare holo', label: 'Standard Holo' },
  { key: 'reverse', value: 'reverse holo', label: 'Reverse Holo' },
  { key: 'cosmos', value: 'rare holo cosmos', label: 'Cosmos Holo' },
  { key: 'galaxy', value: 'rare holo cosmos', label: 'Galaxy Holo' },
  { key: 'radiant', value: 'radiant rare', label: 'Radiant' },
  { key: 'vmax', value: 'rare holo vmax', label: 'VMAX' },
  { key: 'vstar', value: 'rare holo vstar', label: 'VSTAR' },
  { key: 'secret', value: 'rare secret', label: 'Secret Rare' },
  { key: 'gallery', value: 'trainer gallery rare holo', label: 'Trainer Gallery' },
]
// Labels for TCGplayer's own SKU key names, which differ from ours (see
// TCGPLAYER_KEYS_BY_VARIANT in cards.js) -- used when displaying whichever
// entry pickTcgplayerEntry actually returns.
const TCGPLAYER_LABELS = {
  normal: 'Normal',
  holofoil: 'Holo',
  'reverse-holofoil': 'Reverse Holo',
  '1st-edition-holofoil': '1st Edition Holo',
  '1st-edition-normal': '1st Edition',
  'unlimited-holofoil': 'Holo',
}

function trueVariantKeys(card) {
  if (!card?.variants) return []
  return Object.entries(card.variants).filter(([, present]) => present).map(([key]) => key)
}

function defaultVariant(card) {
  const keys = trueVariantKeys(card)
  return VARIANT_ORDER.find((key) => keys.includes(key)) ?? null
}

// Shrinks with viewport width so 4 action buttons (Save Variant, Move, Remove
// from Binder, Close) fit on one row instead of wrapping. The upper bound
// (hit once the panel is at its 640px max-width, i.e. viewport >~680px) is
// tuned to what actually fits -- vw alone would keep growing past that.
const actionButtonStyle = {
  padding: 'clamp(0.25rem, 1.4vw, 0.55rem) clamp(0.4rem, 2.2vw, 0.9rem)',
  fontSize: 'clamp(0.68rem, 2.2vw, 0.95rem)',
  whiteSpace: 'nowrap',
}

export default function CardDetailPopup({ cardId, actions, onClose, ownedVariant, ownedFoilType, language = 'en' }) {
  const { card, error } = useCardData(cardId, language)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedFoilType, setSelectedFoilType] = useState(ownedFoilType ?? '')
  const [zoomed, setZoomed] = useState(false)
  // Danger actions (Remove from Binder) arm on first tap and only fire on
  // the second, so a stray tap can't silently discard a placed card.
  const [armedLabel, setArmedLabel] = useState(null)
  const onBackdropClick = useDismiss(onClose)

  // Seeds the pickers once per card load: view mode starts on whatever's
  // already owned so "change variant/foil" doesn't silently reset it first.
  useEffect(() => {
    if (!card) return
    setSelectedVariant(ownedVariant ?? defaultVariant(card))
    setSelectedFoilType(ownedFoilType ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card])

  const variantKeys = trueVariantKeys(card)
  // selectedVariant is seeded from ownedVariant (view mode) or the picker's
  // default (add mode), so it always reflects what's currently chosen --
  // including live picker changes when editing an already-placed card.
  const tcgplayerEntry = card && pickTcgplayerEntry(card.pricing?.tcgplayer, selectedVariant)
  return (
    <div className="card-detail-overlay" onClick={onBackdropClick}>
      <div className="card-detail-panel">
        {error && <p className="card-search-error">Couldn't load details</p>}
        {!error && !card && <p>Loading...</p>}
        {card && (
          <>
            <div
              className={`card-detail-image${zoomed ? ' card-detail-image--zoomed' : ''}`}
              onClick={() => setZoomed((z) => !z)}
            >
              <HoloCard card={card} customFoilType={selectedFoilType || null} ownedVariant={selectedVariant} />
            </div>
            <div className="card-detail-info">
              <h2>{card.name}</h2>

              <div className="card-detail-section">
                <p>
                  {[
                    card.rarity,
                    card.set?.name && card.set?.cardCount
                      ? `${card.set.name} (${card.set.cardCount.official}/${card.set.cardCount.total})`
                      : card.set?.name,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
                {card.illustrator && <p>Illustrator: {card.illustrator}</p>}
                {variantKeys.length > 0 && (
                  <p>Print variants: {variantKeys.map((key) => VARIANT_LABELS[key] || key).join(', ')}</p>
                )}
                {/* Shown in both modes: "add" picks the variant to place, "view"
                    lets you correct/change the variant of a card already placed
                    (selectedVariant starts at ownedVariant, see the seed effect). */}
                {variantKeys.length > 1 && (
                  <div className="card-detail-variant-picker">
                    {variantKeys.map((key) => (
                      <label key={key}>
                        <input
                          type="radio"
                          name="variant"
                          checked={selectedVariant === key}
                          onChange={() => setSelectedVariant(key)}
                        />
                        {VARIANT_LABELS[key] || key}
                      </label>
                    ))}
                  </div>
                )}
                {/* Overrides the holo effect TCGdex can't tell us (cosmos,
                    galaxy, vmax, etc -- see FOIL_TYPE_OPTIONS above). */}
                <div className="card-detail-section card-detail-foil-picker">
                  <label htmlFor="foil-effect-select">Foil effect</label>
                  <select
                    id="foil-effect-select"
                    value={selectedFoilType}
                    onChange={(e) => setSelectedFoilType(e.target.value)}
                  >
                    {FOIL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {tcgplayerEntry && (
                  <p>
                    TCGplayer: ${tcgplayerEntry[1].marketPrice.toFixed(2)} ({TCGPLAYER_LABELS[tcgplayerEntry[0]] || tcgplayerEntry[0]})
                  </p>
                )}
              </div>
            </div>
          </>
        )}
        <div className="card-detail-actions">
          {/* Actions hidden until the card loads so a click can't fire with
              selectedVariant still null. requiresVariantChoice actions (e.g.
              Save Variant) only make sense when there's more than one print
              variant to choose between. Padding/font shrink with viewport
              width so all buttons stay on one row instead of wrapping. */}
          {card && actions?.filter((a) => !a.requiresVariantChoice || variantKeys.length > 1).map((a) => (
            <NavBtn
              key={a.label}
              danger={a.danger}
              onClick={() => {
                if (a.danger && armedLabel !== a.label) return setArmedLabel(a.label)
                a.onClick(selectedVariant, selectedFoilType || null)
              }}
              style={actionButtonStyle}
            >
              {a.danger && armedLabel === a.label ? 'Tap again to confirm' : a.label}
            </NavBtn>
          ))}
          <NavBtn onClick={onClose} style={actionButtonStyle}>Close</NavBtn>
        </div>
      </div>
    </div>
  )
}
