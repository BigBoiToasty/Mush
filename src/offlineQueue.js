import { saveCards, deleteCard, moveCard } from './binderDb'
import { readQueue, writeQueue, readSlots, cacheSlots } from './offlineCache'

// Offline write queue: when a place/remove can't reach Supabase, the op is
// queued in localStorage and mirrored into the per-page slot cache (which the
// binder already renders from while offline), then replayed in order once the
// network returns. Ops are idempotent (upsert / delete), so a replay that
// races or repeats is harmless.
// ponytail: last-write-wins, no cross-device conflict handling -- fine while
// a binder belongs to one person; revisit if binders ever go multi-editor.

// Ops:
//   { type: 'place', slot }  -- slot is the full row saveCards takes
//   { type: 'remove', binder_id, page_number, slot_number }
//   { type: 'move', binder_id, src: { page, slot }, dest: { page, slot } }

function opTarget(op) {
  return op.type === 'place'
    ? { binder_id: op.slot.binder_id, page_number: op.slot.page_number, slot_number: op.slot.slot_number }
    : op
}

// Offline mirror of move_card: the card at src goes to dest, and whatever was
// at dest (if anything) goes to src.
function applyMoveToCache({ binder_id, src, dest }) {
  const srcPage = readSlots(binder_id, src.page) ?? []
  const moving = srcPage.find((s) => s.slot_number === src.slot)
  if (!moving) return
  const destPage = src.page === dest.page ? srcPage : (readSlots(binder_id, dest.page) ?? [])
  const displaced = destPage.find((s) => s.slot_number === dest.slot)
  const strip = (slots, slot) => slots.filter((s) => s.slot_number !== slot)
  const at = (s, page, slot) => ({ ...s, page_number: page, slot_number: slot })
  if (src.page === dest.page) {
    const rest = strip(strip(srcPage, src.slot), dest.slot)
    rest.push(at(moving, dest.page, dest.slot))
    if (displaced) rest.push(at(displaced, src.page, src.slot))
    cacheSlots(binder_id, src.page, rest)
    return
  }
  const newSrc = strip(srcPage, src.slot)
  if (displaced) newSrc.push(at(displaced, src.page, src.slot))
  const newDest = strip(destPage, dest.slot)
  newDest.push(at(moving, dest.page, dest.slot))
  cacheSlots(binder_id, src.page, newSrc)
  cacheSlots(binder_id, dest.page, newDest)
}

// Mirror an op into the cached page so the UI shows the change offline.
function applyOpToCache(op) {
  if (op.type === 'move') return applyMoveToCache(op)
  const { binder_id, page_number, slot_number } = opTarget(op)
  const slots = (readSlots(binder_id, page_number) ?? []).filter((s) => s.slot_number !== slot_number)
  if (op.type === 'place') slots.push(op.slot)
  cacheSlots(binder_id, page_number, slots)
}

export function enqueueOp(op) {
  writeQueue([...readQueue(), op])
  applyOpToCache(op)
}

// Run the live write; if it fails while offline (or we already know we're
// offline), queue the op instead and report success to the caller.
export async function writeOrQueue(op, write) {
  if (navigator.onLine) {
    try {
      return await write()
    } catch (err) {
      if (navigator.onLine) throw err // real server error, not connectivity
    }
  }
  enqueueOp(op)
}

// Replay queued ops in order. Stops at the first failure (still offline) and
// keeps the rest queued for the next attempt. Returns how many ops landed so
// callers know whether to refresh.
export async function flushQueue() {
  let flushed = 0
  let queue = readQueue()
  while (queue.length) {
    const op = queue[0]
    try {
      if (op.type === 'place') await saveCards(op.slot)
      else if (op.type === 'move') await moveCard(op.binder_id, op.src, op.dest)
      else await deleteCard(op.binder_id, op.page_number, op.slot_number)
    } catch {
      break
    }
    queue = queue.slice(1)
    writeQueue(queue)
    flushed++
  }
  return flushed
}
