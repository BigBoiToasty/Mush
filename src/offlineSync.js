import { getBinders, getAllBinderSlots } from './cards'
import { cacheSlots } from './offlineCache'

export function groupSlotsByPage(slots) {
  const byPage = new Map()
  for (const slot of slots) {
    const arr = byPage.get(slot.page_number) ?? []
    arr.push(slot)
    byPage.set(slot.page_number, arr)
  }
  return byPage
}

export function uniqueImageUrls(slots) {
  return [...new Set(slots.map((s) => s.card_image).filter(Boolean))]
}

// Walk every binder's slots once, cache them per page, and warm the service
// worker's image cache so the whole collection is viewable offline. Best-effort
// and fire-and-forget; getBinders/getAllBinderSlots already log their own errors.
export async function syncAllForOffline(userId) {
  const binders = await getBinders(userId)
  for (const binder of binders) {
    const slots = await getAllBinderSlots(binder.id)
    for (const [page, pageSlots] of groupSlotsByPage(slots)) {
      cacheSlots(binder.id, page, pageSlots)
    }
    for (const url of uniqueImageUrls(slots)) {
      fetch(url).catch(() => {}) // warm the image cache; ignore failures
    }
  }
}
