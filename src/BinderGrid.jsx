import CardSlot from './CardSlot'
import LoadingDots from './LoadingDots'

export function slotsByNumber(slots) {
  const bySlot = Array(9).fill(null)
  for (const slot of slots) {
    if (slot.slot_number >= 0 && slot.slot_number < 9) {
      bySlot[slot.slot_number] = slot
    }
  }
  return bySlot
}

export default function BinderGrid({ pageNumber, slots, heldCard, onSlotChoose, onSlotView }) {
  // slots === null means "not yet known" (first-ever load, no cache to show
  // meanwhile) -- render one loading box per slot instead of "Choose Pokemon"
  // empty-slot buttons, which would falsely claim the page is confirmed empty.
  if (slots === null) {
    return (
      <div className="testGallery">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="box">
            <div className="loading-box"><LoadingDots /></div>
          </div>
        ))}
      </div>
    )
  }
  const bySlot = slotsByNumber(slots)
  return (
    <div className="testGallery">
      {bySlot.map((slot, i) => (
        <CardSlot
          key={i}
          slot={slot}
          isHeld={!!heldCard && heldCard.srcPage === pageNumber && heldCard.srcSlot === i}
          onChoose={onSlotChoose ? () => onSlotChoose(pageNumber, i) : undefined}
          onView={() => onSlotView(pageNumber, i, slot)}
        />
      ))}
    </div>
  )
}
