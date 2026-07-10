import CardSlot from './CardSlot'

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
