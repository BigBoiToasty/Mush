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
//
// `priority` (optional) is the { binderId, page } spread the user is actually
// looking at. Its images are fetched first, at normal priority, so that page
// finishes (and looks "instant") before we spend bandwidth on the rest of the
// collection at low priority -- which the browser then schedules behind
// anything still on screen instead of competing with it for connections.
export async function syncAllForOffline(userId, priority) {
  const binders = await getBinders(userId)
  const ordered = priority
    ? [...binders].sort((a) => (a.id === priority.binderId ? -1 : 0))
    : binders

  for (const binder of ordered) {
    const slots = await getAllBinderSlots(binder.id)
    for (const [page, pageSlots] of groupSlotsByPage(slots)) {
      cacheSlots(binder.id, page, pageSlots)
    }

    const isPriorityBinder = priority && binder.id === priority.binderId
    const priorityUrls = isPriorityBinder
      ? uniqueImageUrls(slots.filter((s) => s.page_number === priority.page || s.page_number === priority.page + 1))
      : []
    const prioritySet = new Set(priorityUrls)
    const restUrls = uniqueImageUrls(slots).filter((url) => !prioritySet.has(url))

    await Promise.all(priorityUrls.map((url) => fetch(url).catch(() => {})))
    await Promise.all(restUrls.map((url) => fetch(url, { priority: 'low' }).catch(() => {})))
  }
}
