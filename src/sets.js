// Set completion: which cards of each set a binder holds.
import { fetchCard, cardKey, setUrl } from './tcgdex'
import { getAllBinderSlots } from './binderDb'

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
    const key = cardKey(s.language, s.card_id)
    if (!entryByKey.has(key)) entryByKey.set(key, { language: s.language, card_id: s.card_id, pages: [] })
    entryByKey.get(key).pages.push(s.page_number)
  }
  const pairs = [...entryByKey.values()]
  pairs.forEach((p) => p.pages.sort((a, b) => a - b))

  const cards = await Promise.all(pairs.map(({ language, card_id }) => fetchCard(language, card_id)))

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
  const response = await fetch(setUrl(language, setId))
  if (!response.ok) throw new Error(`Failed to load set ${setId}`)
  const data = await response.json()
  return annotateSetCards(data.cards, ownedCardPages)
}
