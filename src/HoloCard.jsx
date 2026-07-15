import { useHoloPointer } from './holoPointer'
import { guessFoilType } from './foilHeuristic'
import FadeImg from './FadeImg'

// Maps TCGdex card data + our custom_foil_type override to the DOM shape
// simeydotme/pokemon-cards-css's selectors expect (see public/css/cards/*.css
// and /LICENSE, GPL-3.0). Two corrections from a plain TCGdex->attribute
// mapping:
//  - the card__translater/card__rotator wrapper divs are required: base.css
//    puts the translate3d+scale transform on .card__translater and the
//    rotateY/rotateX tilt on .card__rotator specifically -- flattening them
//    into one wrapper means nothing rotates.
//  - the trainer gallery flag is `data-trainer-gallery`, not `data-gallery`;
//    every effect file that branches on it (rainbow-alt.css, trainer-
//    gallery-*.css) selects on that exact attribute name.
//
// customFoilType (the manual picker in CardDetailPopup) always overrides the
// guessFoilType heuristic below -- guessing only fills in what TCGdex and the
// user haven't told us. `imageSrc` overrides the computed image URL when the
// caller already has a resolved one (the grid's cached slot.card_image),
// since that URL gets built differently across insert paths (search vs CSV
// import) and re-deriving it here would be fragile.
//
// TCGdex reports category as plain ASCII ("Pokemon"), but the vendored CSS
// selects on the accented "pokémon" (v-full-art.css, v-regular.css, etc --
// matching pokemontcg.io's own supertype spelling, which Simon's app was
// built against). Left un-translated, every Pokemon-category full art/V/VMAX
// effect that gates on [data-supertype="pokémon"] silently never matches.
const SUPERTYPE_MAP = { pokemon: 'pokémon', trainer: 'trainer', energy: 'energy' }

export default function HoloCard({ card, customFoilType, ownedVariant, onClick, ariaLabel, imageSrc }) {
  const rotatorRef = useHoloPointer()

  const guessed = guessFoilType(card, ownedVariant)
  const fallbackSubtypes = `${card.stage || ''} ${card.suffix || ''}`.trim().toLowerCase()
  const subtypes = guessed.dataSubtypes || fallbackSubtypes
  const supertype = card.category ? (SUPERTYPE_MAP[card.category.toLowerCase()] || card.category.toLowerCase()) : ''
  // No raw card.rarity.toLowerCase() fallback here on purpose: guessFoilType
  // is the single source of truth for auto-guessing now (Rule D already
  // covers the one case a literal passthrough usefully caught -- plain
  // "rare holo"). An unrecognized rarity renders matte instead of an
  // uncontrolled string that might coincidentally half-match some other
  // effect's selector.
  const rarity = customFoilType || guessed.dataRarity
  const isTrainerGallery = guessed.dataTrainerGallery === 'true'
    || (!!card.rarity && (card.rarity.includes('Gallery') || card.rarity === 'Illustration Rare'))
  // TCGdex's own vocabulary ("Colorless", "Metal", ...) -- used by
  // reverse-holo.css to dim the glare on types where it reads too bright.
  const energyType = (card.types || []).join(' ').toLowerCase()

  return (
    <div
      className="card interactive"
      data-number={card.localId}
      data-set={card.set?.id}
      data-subtypes={subtypes}
      data-supertype={supertype}
      data-rarity={rarity}
      data-trainer-gallery={isTrainerGallery ? 'true' : 'false'}
      data-clip-era={guessed.clipEra}
      data-type={energyType}
    >
      <div className="card__translater">
        <button
          type="button"
          className="card__rotator"
          ref={rotatorRef}
          onClick={onClick}
          aria-label={ariaLabel || card.name}
        >
          <div className="card__front">
            <FadeImg src={imageSrc || (card.image ? `${card.image}/high.webp` : 'fallback.png')} alt={card.name} />
            <div className="card__shine"></div>
            <div className="card__glare"></div>
          </div>
        </button>
      </div>
    </div>
  )
}
