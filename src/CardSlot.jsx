import { useCardData } from './useCardData'
import HoloCard from './HoloCard'
import LoadingDots from './LoadingDots'
import FadeImg from './FadeImg'

export default function CardSlot({ slot, isHeld, onChoose, onView }) {
  const boxClass = isHeld ? 'box box-held' : 'box'
  // Hooks must run unconditionally -- called with nulls when there's no slot,
  // useCardData treats a null cardId as a no-op (see its `key` guard).
  const { card, error } = useCardData(slot?.card_id, slot?.language)

  if (!slot) {
    if (!onChoose) return <div className={boxClass} />
    return (
      <div className={boxClass}>
        <button type="button" className="box-empty-btn" onClick={onChoose}>
          Choose Pokemon
        </button>
      </div>
    )
  }

  // Still fetching the full card -- show "Loading..." rather than any
  // partial/half-drawn image.
  if (!card && !error) {
    return (
      <div className={boxClass}>
        <button type="button" className="box-empty-btn" onClick={onView} aria-label="View card">
          <LoadingDots />
        </button>
      </div>
    )
  }

  // Fetch failed (offline, etc) and will never resolve on its own -- fall
  // back to the cached image instead of leaving the user stuck on
  // "Loading..." forever. FadeImg still only swaps it in once fully decoded.
  if (!card) {
    return (
      <div className={boxClass}>
        <button type="button" onClick={onView} aria-label="View card">
          <FadeImg src={slot.card_image} alt={slot.card_id} />
        </button>
      </div>
    )
  }

  return (
    <div className={boxClass}>
      <HoloCard
        card={card}
        customFoilType={slot.custom_foil_type}
        ownedVariant={slot.variant}
        imageSrc={slot.card_image}
        onClick={onView}
        ariaLabel="View card"
      />
    </div>
  )
}
