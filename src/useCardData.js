import { useEffect, useState } from 'react'
import { fetchCard, peekCard } from './tcgdex'

const loadedState = (card) => ({ card, loading: false, error: false })

// One card's full TCGdex data, from the app-wide card cache in tcgdex.js.
// Returns { card: null, loading: false, error: true } on failure so callers
// can fall back to the plain stored image -- the binder grid must keep
// working offline. Failures aren't cached: the next mount retries.
export function useCardData(cardId, language) {
  const [state, setState] = useState(() => {
    const cached = cardId ? peekCard(language, cardId) : undefined
    return cached ? loadedState(cached) : { card: null, loading: !!cardId, error: false }
  })

  useEffect(() => {
    if (!cardId) return
    const cached = peekCard(language, cardId)
    if (cached) {
      setState(loadedState(cached))
      return
    }
    let cancelled = false
    setState({ card: null, loading: true, error: false })
    fetchCard(language, cardId).then((card) => {
      if (!cancelled) setState(card ? loadedState(card) : { card: null, loading: false, error: true })
    })
    return () => {
      cancelled = true
    }
  }, [cardId, language])

  return state
}
