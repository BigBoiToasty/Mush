import { useEffect, useState } from 'react'
import { fetchCard, cardKey } from './cards'

// Module-level, not component state: shared across every CardSlot/
// CardDetailPopup instance so flipping back to an already-visited binder
// page, or reopening a popup for a card already shown in the grid, costs
// zero network calls instead of refetching. No expiry -- TCGdex card
// metadata doesn't change mid-session.
const cache = new Map()

// Fetches (and caches) one card's full TCGdex data. Returns { card: null,
// loading: false, error: true } on failure so callers can fall back to a
// plain cached image instead of showing nothing -- the binder grid must
// keep working offline.
export function useCardData(cardId, language) {
  const key = cardId ? cardKey(language, cardId) : null
  const [state, setState] = useState(() => (key && cache.has(key) ? cache.get(key) : { card: null, loading: !!key, error: false }))

  useEffect(() => {
    if (!key) return
    if (cache.has(key)) {
      setState(cache.get(key))
      return
    }
    let cancelled = false
    setState({ card: null, loading: true, error: false })
    fetchCard(language, cardId).then((card) => {
      const result = card ? { card, loading: false, error: false } : { card: null, loading: false, error: true }
      cache.set(key, result)
      if (!cancelled) setState(result)
    })
    return () => {
      cancelled = true
    }
  }, [key, cardId, language])

  return state
}
