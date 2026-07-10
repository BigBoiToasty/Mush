import HoloTilt from './HoloTilt'

export default function CardSlot({ slot, isHeld, onChoose, onView }) {
  const boxClass = isHeld ? 'box box-held' : 'box'
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

  return (
    <div className={boxClass}>
      <button type="button" onClick={onView} aria-label="View card">
        <HoloTilt variant={slot.variant} cardId={slot.card_id} language={slot.language ?? 'en'}>
          <img src={slot.card_image} alt={slot.card_id} />
        </HoloTilt>
      </button>
    </div>
  )
}
