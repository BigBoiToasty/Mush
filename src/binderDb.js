// Every Supabase read and write for binders, slots, profiles and share links.
import { supabase } from './supabaseClient'
import { cacheSlots, readSlots, readAllSlots, cacheBinders, readBinders } from './offlineCache'
import { fetchCard, cardKey } from './tcgdex'
import { extractCardPrice } from './pricing'

// A slot row as stored (snake_case) <-> the card shape the UI passes around
// (camelCase). The only two places that know both spellings.
export function slotToCard(slot) {
  return {
    cardId: slot.card_id,
    cardImage: slot.card_image,
    variant: slot.variant ?? null,
    cardName: slot.card_name,
    language: slot.language ?? 'en',
    customFoilType: slot.custom_foil_type,
  }
}

export function cardToSlot(binderId, pageNumber, slotNumber, card) {
  return {
    binder_id: binderId,
    page_number: pageNumber,
    slot_number: slotNumber,
    card_id: card.cardId,
    card_image: card.cardImage,
    variant: card.variant ?? null,
    card_name: card.cardName ?? null,
    language: card.language ?? 'en',
    custom_foil_type: card.customFoilType ?? null,
  }
}

// Offline fallback for both find functions below: same case-insensitive
// substring match Postgres's ilike does, ordered the same way (by page).
function searchSlotsOffline(slots, query) {
  const q = query.toLowerCase()
  return slots
    .filter((s) => s.card_name?.toLowerCase().includes(q))
    .sort((a, b) => a.page_number - b.page_number)
}

// Escape LIKE metacharacters so a user-typed % or _ matches literally
// instead of acting as a wildcard.
const escapeLike = (query) => query.replace(/[\\%_]/g, '\\$&')

export async function getCards(binderId, pageNumber) {
  const { data, error } = await supabase
    .from('binder_slots')
    .select('*')
    .eq('binder_id', binderId)
    .eq('page_number', pageNumber)

  if (error) {
    console.error('Load error:', error)
    return readSlots(binderId, pageNumber) ?? [] // offline: serve last-synced page
  }

  cacheSlots(binderId, pageNumber, data)
  return data
}

// Every slot in a binder in one query -- used by the offline background sync to
// cache all pages at once instead of one request per page.
export async function getAllBinderSlots(binderId) {
  const { data, error } = await supabase
    .from('binder_slots')
    .select('*')
    .eq('binder_id', binderId)

  if (error) {
    console.error('All slots load error:', error)
    return []
  }

  return data
}

export async function saveCards(slot) {
  const { error } = await supabase
    .from('binder_slots')
    .upsert(slot, { onConflict: 'binder_id, page_number, slot_number' })

  if (error) {
    console.error('Save error:', error)
    throw error
  }
}

export async function deleteCard(binderId, pageNumber, slotNumber) {
  const { error } = await supabase
    .from('binder_slots')
    .delete()
    .eq('binder_id', binderId)
    .eq('page_number', pageNumber)
    .eq('slot_number', slotNumber)

  if (error) {
    console.error('Delete error:', error)
    throw error
  }
}

export async function findCardsByName(binderId, query) {
  const { data, error } = await supabase
    .from('binder_slots')
    .select('*')
    .eq('binder_id', binderId)
    .ilike('card_name', `%${escapeLike(query)}%`)
    .order('page_number', { ascending: true })

  if (error) {
    console.error('Find cards error:', error)
    return searchSlotsOffline(readAllSlots(binderId), query) // offline: search the last-synced cache
  }

  return data
}

export async function findCardsByNameAllBinders(userId, query) {
  const binders = await getBinders(userId)
  if (!binders.length) return []

  const { data, error } = await supabase
    .from('binder_slots')
    .select('*')
    .in('binder_id', binders.map((b) => b.id))
    .ilike('card_name', `%${escapeLike(query)}%`)
    .order('page_number', { ascending: true })

  const namesById = new Map(binders.map((b) => [b.id, b.name]))

  if (error) {
    console.error('Find cards across binders error:', error)
    // offline: search each binder's last-synced cache
    const slots = binders.flatMap((b) => readAllSlots(b.id))
    return searchSlotsOffline(slots, query).map((slot) => ({ ...slot, binder_name: namesById.get(slot.binder_id) }))
  }

  return data.map((slot) => ({ ...slot, binder_name: namesById.get(slot.binder_id) }))
}

// One backfill attempt per binder per session; new placements write
// card_name themselves, so this only exists to name legacy rows.
const backfilledBinders = new Set()

export async function backfillCardNames(binderId) {
  if (backfilledBinders.has(binderId)) return
  backfilledBinders.add(binderId)

  const { data, error } = await supabase
    .from('binder_slots')
    .select('card_id, language')
    .eq('binder_id', binderId)
    .is('card_name', null)

  if (error || !data?.length) return

  // A card_id only resolves against its own language's endpoint, so backfill
  // per unique (language, card_id) pair.
  const pairs = [...new Map(data.map((s) => [cardKey(s.language, s.card_id), s])).values()]
  await Promise.all(pairs.map(async ({ card_id, language }) => {
    const card = await fetchCard(language, card_id)
    if (!card) return
    // Keyed on card_id + language + still-null so a slot replaced mid-backfill
    // never gets the old card's name stamped onto it.
    await supabase
      .from('binder_slots')
      .update({ card_name: card.name })
      .eq('binder_id', binderId)
      .eq('card_id', card_id)
      .eq('language', language)
      .is('card_name', null)
  }))
}

export async function getBinderCounts(binderId) {
  const { data, error } = await supabase
    .from('binder_slots')
    .select('page_number')
    .eq('binder_id', binderId)

  if (error || !data) return { cardCount: 0, pageCount: 0 }

  return {
    cardCount: data.length,
    pageCount: data.length ? Math.max(...data.map((slot) => slot.page_number)) : 0,
  }
}

// Fetches live pricing for every unique card in the binder (one API call
// per unique card, not per slot) and sums each slot's owned-variant price.
export async function getBinderWorth(binderId) {
  const { data, error } = await supabase
    .from('binder_slots')
    .select('card_id, variant, language')
    .eq('binder_id', binderId)

  if (error || !data?.length) return 0

  const key = (slot) => cardKey(slot.language, slot.card_id)
  const pairs = [...new Map(data.map((slot) => [key(slot), slot])).values()]
  const cardsByKey = new Map()
  await Promise.all(pairs.map(async (slot) => {
    const card = await fetchCard(slot.language, slot.card_id)
    if (card) cardsByKey.set(key(slot), card)
  }))

  return data.reduce((sum, slot) => {
    const card = cardsByKey.get(key(slot))
    return card ? sum + (extractCardPrice(card, slot.variant) ?? 0) : sum
  }, 0)
}

export async function getBinders(userId) {
  const { data, error } = await supabase
    .from('binders')
    .select('*')
    .eq('user_id', userId)
    .order('id') // deterministic binders[0] for users with multiple binders

  if (error) {
    console.error('Binder load error:', error)
    return readBinders(userId) ?? [] // offline: serve last-synced binder list
  }

  cacheBinders(userId, data)
  return data
}

export async function createBinders(name, userId) {
  const { data, error } = await supabase
    .from('binders')
    .insert({name, user_id: userId})
    .select()
    .single()
    
  if (error) {
    console.error('Binder create error:', error)
    return null
  }

  return data
}

// Pure planner for a card move/swap. Returns the ordered write ops BinderPage
// should execute. Place-before-remove so a failed remove leaves a recoverable
// duplicate rather than losing the card.
// ponytail: not atomic -- a failed remove on a cross-page move leaves a dup.
// Add a DB function only if Mush ever goes multi-user.
export function planMove(src, dest, heldCard, destCard) {
  if (src.page === dest.page && src.slot === dest.slot) return []
  if (!destCard) {
    return [
      { type: 'place', page: dest.page, slot: dest.slot, card: heldCard.card },
      { type: 'remove', page: src.page, slot: src.slot },
    ]
  }
  return [
    { type: 'place', page: dest.page, slot: dest.slot, card: heldCard.card },
    { type: 'place', page: src.page, slot: src.slot, card: destCard },
  ]
}

export async function renameBinders(binderId, name) {
  const { error } = await supabase
    .from('binders')
    .update({ name })
    .eq('id', binderId)

  if (error) {
    console.error('Binder rename error:', error)
    throw error
  }
}

export async function setButtonPrefs(userId, { skin, border, fill, text }) {
  const { error } = await supabase
    .from('profiles')
    .update({ button_skin: skin, button_border: border, button_fill: fill, button_text: text })
    .eq('user_id', userId)

  if (error) console.error('Button prefs save error:', error)
}

export async function setBinderBackground(binderId, url) {
  const { error } = await supabase
    .from('binders')
    .update({ background_image_url: url })
    .eq('id', binderId)

  if (error) throw error
}

export async function getBinderBackground(binderId) {
  const { data, error } = await supabase
    .from('binders')
    .select('background_image_url')
    .eq('id', binderId)
    .maybeSingle()

  if (error || !data) return null
  return data.background_image_url
}

// One image per binder: the fixed `${userId}/${binderId}.{ext}` path means a
// re-upload overwrites the previous file in place, so there's nothing to
// garbage-collect when a user replaces their background.
export async function uploadBinderBackground(userId, binderId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${binderId}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('binder-backgrounds')
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('binder-backgrounds').getPublicUrl(path)
  await setBinderBackground(binderId, data.publicUrl)
  return data.publicUrl
}

// Bulk upsert for CSV import -- one request for the whole file. Same
// conflict target as saveCards, so imported rows replace occupied slots.
export async function importSlots(binderId, slots) {
  const rows = slots.map((s) => ({ ...s, binder_id: binderId }))
  const { error } = await supabase
    .from('binder_slots')
    .upsert(rows, { onConflict: 'binder_id, page_number, slot_number' })

  if (error) {
    console.error('Import error:', error)
    throw error
  }
}

export async function deleteBinders(binderId) {
  // Delete slots first regardless of whether a DB cascade exists on
  // binder_id -- safe either way, and guarantees no orphaned rows if not.
  const { error: slotsError } = await supabase
    .from('binder_slots')
    .delete()
    .eq('binder_id', binderId)

  if (slotsError) {
    console.error('Delete binder slots error:', slotsError)
    throw slotsError
  }

  const { error } = await supabase
    .from('binders')
    .delete()
    .eq('id', binderId)

  if (error) {
    console.error('Delete binder error:', error)
    throw error
  }
}

export async function getBinderShareToken(binderId) {
  const { data, error } = await supabase
    .from('binders')
    .select('share_token')
    .eq('id', binderId)
    .maybeSingle()

  if (error) {
    console.error('Get share token error:', error)
    return null
  }

  return data?.share_token ?? null
}

export async function setBinderShareToken(binderId, token) {
  const { error } = await supabase
    .from('binders')
    .update({ share_token: token })
    .eq('id', binderId)

  if (error) {
    console.error('Set share token error:', error)
    throw error
  }
}

// Public read path for a shared binder -- goes through the get_shared_binder*
// RPCs (see Task 1), never a raw table select, so a wrong/guessed token
// simply returns nothing instead of exposing other users' binders.
export async function getSharedBinder(token) {
  const { data, error } = await supabase.rpc('get_shared_binder', { token })

  if (error) {
    console.error('Get shared binder error:', error)
    throw error
  }

  return data?.[0] ?? null
}

export async function searchSharedBinder(token, query) {
  const { data, error } = await supabase.rpc('search_shared_binder', { token, query: escapeLike(query) })

  if (error) {
    console.error('Search shared binder error:', error)
    throw error
  }

  return data
}

export async function getSharedBinderSlots(token, pageNumber) {
  const { data, error } = await supabase.rpc('get_shared_binder_slots', { token, page: pageNumber })

  if (error) {
    console.error('Get shared binder slots error:', error)
    throw error
  }

  return data
}
