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
// worker's image cache so the whole collection is viewable offline. Best-effort;
// getBinders/getAllBinderSlots already log their own errors. The returned
// promise resolves once every image has actually been fetched (or failed), so
// callers can use it as an "offline-ready" signal.
export async function syncAllForOffline(userId) {
  const binders = await getBinders(userId)
  for (const binder of binders) {
    const slots = await getAllBinderSlots(binder.id)
    for (const [page, pageSlots] of groupSlotsByPage(slots)) {
      cacheSlots(binder.id, page, pageSlots)
    }
    await Promise.all(uniqueImageUrls(slots).map((url) => fetch(url).catch(() => {})))
  }
}
