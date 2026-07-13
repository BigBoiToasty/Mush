import { useState, useEffect } from 'react'
import { NavBtn, useDismiss } from './ui'
import { pickTcgplayerEntry, cardUrl } from './cards'
import HoloTilt from './HoloTilt'

const VARIANT_LABELS = { firstEdition: '1st Edition', holo: 'Holo', reverse: 'Reverse Holo', normal: 'Normal', wPromo: 'Promo Stamp' }
const VARIANT_ORDER = ['normal', 'holo', 'reverse', 'firstEdition', 'wPromo']
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

export default function CardDetailPopup({ cardId, actions, onClose, ownedVariant, language = 'en' }) {
  const [card, setCard] = useState(null)
  const [error, setError] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [zoomed, setZoomed] = useState(false)
  const onBackdropClick = useDismiss(onClose)

  useEffect(() => {
    let cancelled = false
    setCard(null)
    setError(null)
    fetch(cardUrl(language, cardId))
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load card')
        return response.json()
      })
      .then((data) => {
        if (!cancelled) {
          setCard(data)
          // View mode starts the picker on whatever's already owned so
          // "change variant" doesn't silently reset it to the default first.
          setSelectedVariant(ownedVariant ?? defaultVariant(data))
        }
      })
      .catch((err) => {
        console.error('Card detail error:', err)
        if (!cancelled) setError("Couldn't load details")
      })
    return () => {
      cancelled = true
    }
  }, [cardId, language])

  const variantKeys = trueVariantKeys(card)
  // selectedVariant is seeded from ownedVariant (view mode) or the picker's
  // default (add mode), so it always reflects what's currently chosen --
  // including live picker changes when editing an already-placed card.
  const tcgplayerEntry = card && pickTcgplayerEntry(card.pricing?.tcgplayer, selectedVariant)
  return (
    <div className="card-detail-overlay" onClick={onBackdropClick}>
      <div className="card-detail-panel">
        {error && <p className="card-search-error">{error}</p>}
        {!error && !card && <p>Loading...</p>}
        {card && (
          <>
            <HoloTilt variant={selectedVariant} rarity={card.rarity ?? null}>
              <img
                className={`card-detail-image${zoomed ? ' card-detail-image--zoomed' : ''}`}
                src={`${card.image}/high.webp`}
                alt={card.name}
                onClick={() => setZoomed((z) => !z)}
              />
            </HoloTilt>
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
                    (selectedVariant starts at ownedVariant, see fetch effect). */}
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
            <NavBtn key={a.label} danger={a.danger} onClick={() => a.onClick(selectedVariant)} style={actionButtonStyle}>
              {a.label}
            </NavBtn>
          ))}
          <NavBtn onClick={onClose} style={actionButtonStyle}>Close</NavBtn>
        </div>
      </div>
    </div>
  )
}
