import { useState, useEffect, useCallback } from 'react'
import { getBinders, createBinders, renameBinders, deleteBinders, getCards, saveCards, deleteCard, findCardsByName, findCardsByNameAllBinders, backfillCardNames, getBinderCounts, getLastPage, getBinderWorth, getBinderShareToken, setBinderShareToken, cardToSlot, moveCard as moveCardInDb } from './binderDb'
import { getSetCompletion, getSetCards } from './sets'
import { writeOrQueue } from './offlineQueue'

// Shares one in-flight lookup-or-create promise per userId, so two concurrent
// effect instances (e.g. React StrictMode's double-invoke) can't both see zero
// binders and both call createBinders.
const binderInit = new Map()

// Alt-tabbing away and back (or a backgrounded-tab reload) can remount this
// hook entirely; without this it forgets which binder you were on and falls
// back to binders[0], losing your place and undoing anything you'd shared.
function lastBinderKey(userId) {
  return `mush:lastBinderId:${userId}`
}

function initBinder(userId) {
  if (!binderInit.has(userId)) {
    const promise = (async () => {
      const binders = await getBinders(userId)
      if (binders.length === 0) return createBinders('My Binder', userId)
      const lastId = sessionStorage.getItem(lastBinderKey(userId))
      // sessionStorage holds strings; binder ids are numbers
      return binders.find((b) => String(b.id) === lastId) ?? binders[0]
    })().finally(() => binderInit.delete(userId))
    binderInit.set(userId, promise)
  }
  return binderInit.get(userId)
}

export function useBinder(userId) {
  const [binderId, setBinderId] = useState(null)
  const [binderName, setBinderName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)
    initBinder(userId).then((binder) => {
      if (cancelled) return
      if (binder) {
        setBinderId(binder.id)
        setBinderName(binder.name)
        sessionStorage.setItem(lastBinderKey(userId), binder.id)
        backfillCardNames(binder.id)
      } else {
        setError('Could not create your binder. Please refresh and try again.')
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [userId])

  const fetchPage = useCallback(async (pageNumber) => {
    if (!binderId) return []
    return getCards(binderId, pageNumber)
  }, [binderId])

  // Writes queue for later instead of failing when the network is down (see
  // offlineQueue); a thrown error here means a real server-side failure.
  const placeCard = useCallback(async (pageNumber, slotNumber, card) => {
    if (!binderId) return
    const slot = cardToSlot(binderId, pageNumber, slotNumber, card)
    await writeOrQueue({ type: 'place', slot }, () => saveCards(slot))
  }, [binderId])

  const removeCard = useCallback(async (pageNumber, slotNumber) => {
    if (!binderId) return
    await writeOrQueue(
      { type: 'remove', binder_id: binderId, page_number: pageNumber, slot_number: slotNumber },
      () => deleteCard(binderId, pageNumber, slotNumber),
    )
  }, [binderId])

  const moveCard = useCallback(async (src, dest) => {
    if (!binderId) return
    await writeOrQueue({ type: 'move', binder_id: binderId, src, dest }, () => moveCardInDb(binderId, src, dest))
  }, [binderId])

  const findInBinder = useCallback(async (query) => {
    if (!binderId) return []
    return findCardsByName(binderId, query)
  }, [binderId])

  const findInAllBinders = useCallback((query) => findCardsByNameAllBinders(userId, query), [userId])

  const listBinders = useCallback(() => getBinders(userId), [userId])

  const switchBinder = useCallback((id, name) => {
    setBinderId(id)
    setBinderName(name)
    sessionStorage.setItem(lastBinderKey(userId), id)
    backfillCardNames(id)
  }, [userId])

  const createBinder = useCallback(async (name) => {
    const created = await createBinders(name, userId)
    if (created) {
      setBinderId(created.id)
      setBinderName(created.name)
      sessionStorage.setItem(lastBinderKey(userId), created.id)
    }
    return created
  }, [userId])

  const renameBinder = useCallback(async (id, name) => {
    await renameBinders(id, name)
    if (id === binderId) setBinderName(name)
  }, [binderId])

  const deleteBinder = useCallback((id) => deleteBinders(id), [])

  const getCounts = useCallback(() => getBinderCounts(binderId), [binderId])
  const fetchLastPage = useCallback(() => getLastPage(binderId), [binderId])
  const getWorth = useCallback(() => getBinderWorth(binderId), [binderId])
  const getShareToken = useCallback(() => getBinderShareToken(binderId), [binderId])
  const setShareToken = useCallback((token) => setBinderShareToken(binderId, token), [binderId])
  const getCompletion = useCallback(() => getSetCompletion(binderId), [binderId])

  return {
    binderId, binderName, loading, error, fetchPage, placeCard, removeCard, moveCard, findInBinder, findInAllBinders,
    listBinders, switchBinder, createBinder, renameBinder, deleteBinder, getCounts, fetchLastPage, getWorth,
    getShareToken, setShareToken, getCompletion, getSetCards,
  }
}
