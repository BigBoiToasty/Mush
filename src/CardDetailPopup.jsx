import { useState, useEffect } from 'react'
import { navButtonClass, navButtonStyle, dangerButtonStyle } from './navButton'
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

export default function CardDetailPopup({ cardId, actions, onClose, ownedVariant, language = 'en' }) {
  const [card, setCard] = useState(null)
  const [error, setError] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [zoomed, setZoomed] = useState(false)

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
          setSelectedVariant(defaultVariant(data))
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
  // In view mode ownedVariant is always passed (possibly null for a legacy
  // row); in add mode it's absent, so the picker's selectedVariant drives it.
  const effectiveVariant = ownedVariant !== undefined ? ownedVariant : selectedVariant
  const tcgplayerEntry = card && pickTcgplayerEntry(card.pricing?.tcgplayer, effectiveVariant)
  return (
    <div className="card-detail-overlay">
      <div className="card-detail-panel">
        {error && <p className="card-search-error">{error}</p>}
        {!error && !card && <p>Loading...</p>}
        {card && (
          <>
            <HoloTilt variant={effectiveVariant} rarity={card.rarity ?? null}>
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
                {ownedVariant && <p>Your copy: {VARIANT_LABELS[ownedVariant] || ownedVariant}</p>}
                {/* Picker only in "add" mode (prop absent). In "view" mode the
                    prop is always passed — null just means a legacy row whose
                    variant was never recorded, and the remove action ignores
                    any selection, so a picker there would be a dead control. */}
                {ownedVariant === undefined && variantKeys.length > 1 && (
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
              selectedVariant still null. */}
          {card && actions?.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => a.onClick(selectedVariant)}
              className={navButtonClass}
              style={a.danger ? dangerButtonStyle : navButtonStyle}
            >
              {a.label}
            </button>
          ))}
          <button type="button" onClick={onClose} className={navButtonClass} style={navButtonStyle}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
