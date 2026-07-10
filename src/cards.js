import {supabase} from "./supabaseClient";
import { cacheSlots, readSlots, cacheBinders, readBinders } from './offlineCache'

//  LANGUAGE STUFF

// tcgdex serves each language at its own path and gives the same physical card
// different IDs per language, so every slot stores the language it came from.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh-cn', label: 'Chinese (Simplified)' },
  { code: 'zh-tw', label: 'Chinese (Traditional)' },
]

const LANGUAGE_CODES = new Set(LANGUAGES.map((l) => l.code))

// Allowlist the language before it reaches the URL: it comes from stored rows
// and a search dropdown, so an unexpected value falls back to en rather than
// being interpolated into the request path.
export function cardUrl(language, cardId) {
  const lang = LANGUAGE_CODES.has(language) ? language : 'en'
  return `https://api.tcgdex.net/v2/${lang}/cards/${encodeURIComponent(cardId)}`
}

// True when text contains Japanese kana or CJK ideographs. Lets search tell a
// native-language query (search that language by name directly) from an English
// one (bridge to the target language through the Pokedex number).
export function hasCJK(text) {
  return /[぀-ヿ㐀-鿿豈-﫿ｦ-ﾟ]/.test(text)
}

// tcgdex name search is a "contains" match, so prefer a card whose name equals
// the query exactly (case-insensitive) -- otherwise "Mew" would resolve through
// a Mewtwo card. Falls back to the first result.
export function pickByExactName(cards, name) {
  const lower = name.toLowerCase()
  return cards.find((c) => c.name?.toLowerCase() === lower) ?? cards[0]
}

//  CARD STUFF

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
  // Escape LIKE metacharacters so a user-typed % or _ matches literally
  // instead of acting as a wildcard.
  const escaped = query.replace(/[\\%_]/g, '\\$&')
  const { data, error } = await supabase
    .from('binder_slots')
    .select('*')
    .eq('binder_id', binderId)
    .ilike('card_name', `%${escaped}%`)
    .order('page_number', { ascending: true })

  if (error) {
    console.error('Find cards error:', error)
    throw error
  }

  return data
}

export async function findCardsByNameAllBinders(userId, query) {
  const binders = await getBinders(userId)
  if (!binders.length) return []

  const escaped = query.replace(/[\\%_]/g, '\\$&')
  const { data, error } = await supabase
    .from('binder_slots')
    .select('*')
    .in('binder_id', binders.map((b) => b.id))
    .ilike('card_name', `%${escaped}%`)
    .order('page_number', { ascending: true })

  if (error) {
    console.error('Find cards across binders error:', error)
    throw error
  }

  const namesById = new Map(binders.map((b) => [b.id, b.name]))
  return data.map((slot) => ({ ...slot, binder_name: namesById.get(slot.binder_id) }))
}

// card.variants uses tcgdex's own vocabulary (normal/holo/reverse/
// firstEdition/wPromo); card.pricing.tcgplayer uses TCGplayer's own SKU
// names, which don't match ("holo" -> "holofoil", "reverse" ->
// "reverse-holofoil", etc -- confirmed against the live API). Without this
// map, `variants[variant]` silently misses and falls back to the wrong
// price whenever the selected variant isn't literally "normal".
const TCGPLAYER_KEYS_BY_VARIANT = {
  normal: ['normal'],
  holo: ['holofoil', 'unlimited-holofoil'],
  reverse: ['reverse-holofoil'],
  firstEdition: ['1st-edition-holofoil', '1st-edition-normal'],
  wPromo: ['normal'],
}

// Finds the TCGplayer pricing entry to show/use: the owned/selected
// variant's when priced, else any priced variant. Returns [variantKey, entry].
export function pickTcgplayerEntry(tcgplayer, variant) {
  if (!tcgplayer) return undefined
  const { updated, ...variants } = tcgplayer
  for (const key of TCGPLAYER_KEYS_BY_VARIANT[variant] ?? []) {
    if (variants[key]?.marketPrice != null) return [key, variants[key]]
  }
  return Object.entries(variants).find(([, v]) => v?.marketPrice != null)
}

// Pure: which pointer-tracked shine recipe a card gets. The print style
// depends on the card's rarity, not just the owned variant -- a GX/V/ex/
// ultra card is always a foil print even when its stored variant is
// "normal"/null, and only classic holo rares get the vertical-bar holo.
// Effect keys map to the CSS recipes in styles.css (ported per-rarity from
// simeydotme/pokemon-cards-css). firstEdition/wPromo are print stamps, not
// foil, so on plain rarities they get no effect.
export function holoEffectFor(variant, rarity) {
  if (variant === 'reverse') return 'reverse'
  const r = (rarity ?? '').toLowerCase()
  if (r.includes('vmax')) return 'vmax'
  if (/rainbow|secret|hyper/.test(r)) return 'rainbow'
  if (/\bv\b|vstar|gx|\bex\b|ultra|double rare|illustration|amazing|radiant|shiny|prime|legend|shining|full art|ace spec/.test(r)) return 'v'
  if (variant === 'holo' || r.includes('holo')) return 'holo'
  return null
}

// Rarity for a card the binder grid only knows by id -- same tcgdex JSON
// the detail popup fetches, deduped per session and served from the
// service worker's cache after first load. Resolves null on any failure so
// a missing rarity just means "no fancy effect", never an error.
const rarityCache = new Map()
export function getCardRarity(language, cardId) {
  const key = `${language}|${cardId}`
  if (!rarityCache.has(key)) {
    rarityCache.set(key, fetch(cardUrl(language, cardId))
      .then((response) => (response.ok ? response.json() : null))
      .then((card) => card?.rarity ?? null)
      .catch(() => null))
  }
  return rarityCache.get(key)
}

// Picks one number to represent a card's value: the owned variant's
// TCGplayer market price when available, else any priced TCGplayer
// variant, else null (no Cardmarket fallback -- TCGplayer only, by request).
export function extractCardPrice(card, variant) {
  const entry = pickTcgplayerEntry(card.pricing?.tcgplayer, variant)
  return entry ? entry[1].marketPrice : null
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
  const pairs = [...new Map(data.map((s) => [`${s.language}|${s.card_id}`, s])).values()]
  await Promise.all(pairs.map(async ({ card_id, language }) => {
    try {
      const response = await fetch(cardUrl(language, card_id))
      if (!response.ok) return
      const card = await response.json()
      // Keyed on card_id + language + still-null so a slot replaced mid-backfill
      // never gets the old card's name stamped onto it.
      await supabase
        .from('binder_slots')
        .update({ card_name: card.name })
        .eq('binder_id', binderId)
        .eq('card_id', card_id)
        .eq('language', language)
        .is('card_name', null)
    } catch (err) {
      console.error('Backfill error for', card_id, err)
    }
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

  // Key by language + card_id since the same id can exist in multiple language
  // databases as different cards.
  const key = (slot) => `${slot.language}|${slot.card_id}`
  const pairs = [...new Map(data.map((slot) => [key(slot), slot])).values()]
  const cardsByKey = new Map()
  await Promise.all(pairs.map(async (slot) => {
    try {
      const response = await fetch(cardUrl(slot.language, slot.card_id))
      if (response.ok) cardsByKey.set(key(slot), await response.json())
    } catch (err) {
      console.error('Live price fetch error for', slot.card_id, err)
    }
  }))

  return data.reduce((sum, slot) => {
    const card = cardsByKey.get(key(slot))
    return card ? sum + (extractCardPrice(card, slot.variant) ?? 0) : sum
  }, 0)
}

// Pure: turns a same-index-aligned (pairs, cards) pair into one summary row
// per detected set. A null card (fetch failure) or missing card.set is
// skipped rather than counted, so a flaky tcgdex response can't undercount
// a set's total or misplace a card into the wrong set.
export function groupOwnedCardsBySet(pairs, cards) {
  const setsById = new Map()
  cards.forEach((card, i) => {
    if (!card?.set?.id) return
    const language = pairs[i].language
    const key = `${language}|${card.set.id}`
    if (!setsById.has(key)) {
      setsById.set(key, {
        setId: card.set.id,
        setName: card.set.name,
        language,
        ownedCardIds: new Set(),
        ownedCardPages: new Map(),
        totalCount: card.set.cardCount?.official ?? 0,
      })
    }
    const s = setsById.get(key)
    s.ownedCardIds.add(card.id)
    s.ownedCardPages.set(card.id, pairs[i].pages)
  })

  return [...setsById.values()].map((s) => ({
    setId: s.setId,
    setName: s.setName,
    language: s.language,
    ownedCount: s.ownedCardIds.size,
    totalCount: s.totalCount,
    ownedCardIds: s.ownedCardIds,
    ownedCardPages: s.ownedCardPages,
  }))
}

// One batched fetch per unique owned (language, card_id) -- the same
// per-card tcgdex response already used for pricing includes card.set, so
// this needs no network calls beyond what getBinderWorth already makes.
export async function getSetCompletion(binderId) {
  const slots = await getAllBinderSlots(binderId)
  if (!slots.length) return []

  // A card can occupy more than one slot (duplicates); track every page it's
  // on so the completion view can point at each copy.
  const entryByKey = new Map()
  for (const s of slots) {
    const key = `${s.language}|${s.card_id}`
    if (!entryByKey.has(key)) entryByKey.set(key, { language: s.language, card_id: s.card_id, pages: [] })
    entryByKey.get(key).pages.push(s.page_number)
  }
  const pairs = [...entryByKey.values()]
  pairs.forEach((p) => p.pages.sort((a, b) => a - b))

  const cards = await Promise.all(pairs.map(async ({ language, card_id }) => {
    try {
      const response = await fetch(cardUrl(language, card_id))
      return response.ok ? await response.json() : null
    } catch (err) {
      console.error('Set completion fetch error for', card_id, err)
      return null
    }
  }))

  return groupOwnedCardsBySet(pairs, cards)
}

// Pure: the full set card list, each card flagged with whether it's owned
// and (if so) every binder page it's on -- a card can be a duplicate.
export function annotateSetCards(setCards, ownedCardPages) {
  return setCards.map((c) => ({
    ...c,
    owned: ownedCardPages.has(c.id),
    pages: ownedCardPages.get(c.id) ?? [],
  }))
}

// Called lazily, one set at a time, when a user opens it -- a binder
// spanning many sets must not fire one request per set just to open the
// tracker overlay.
export async function getSetCards(setId, language, ownedCardPages) {
  const lang = LANGUAGE_CODES.has(language) ? language : 'en'
  const response = await fetch(`https://api.tcgdex.net/v2/${lang}/sets/${encodeURIComponent(setId)}`)
  if (!response.ok) throw new Error(`Failed to load set ${setId}`)
  const data = await response.json()
  return annotateSetCards(data.cards, ownedCardPages)
}

//  BINDER STUFF

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
  const escaped = query.replace(/[\\%_]/g, '\\$&')
  const { data, error } = await supabase.rpc('search_shared_binder', { token, query: escaped })

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

