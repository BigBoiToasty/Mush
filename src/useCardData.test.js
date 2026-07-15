// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { useCardData } from './useCardData'

vi.mock('./cards', () => ({
  cardKey: (language, cardId) => `${language}|${cardId}`,
  fetchCard: vi.fn(),
}))
import { fetchCard } from './cards'

// Mounts useCardData in a bare component and exposes its latest return value.
function mountHook(cardId, language) {
  const container = document.createElement('div')
  const root = createRoot(container)
  let latest
  function Probe(props) {
    latest = useCardData(props.cardId, props.language)
    return null
  }
  act(() => {
    root.render(createElement(Probe, { cardId, language }))
  })
  return {
    get value() {
      return latest
    },
    rerender(nextId, nextLanguage) {
      act(() => {
        root.render(createElement(Probe, { cardId: nextId, language: nextLanguage }))
      })
    },
    unmount() {
      act(() => root.unmount())
    },
  }
}

beforeEach(() => {
  fetchCard.mockReset()
})

describe('useCardData', () => {
  it('starts loading then resolves with the fetched card', async () => {
    let resolveFetch
    fetchCard.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)))

    const hook = mountHook('base1-4', 'en')
    expect(hook.value).toEqual({ card: null, loading: true, error: false })

    await act(async () => resolveFetch({ id: 'base1-4', name: 'Charizard' }))
    expect(hook.value).toEqual({ card: { id: 'base1-4', name: 'Charizard' }, loading: false, error: false })
    hook.unmount()
  })

  it('returns an error state when the fetch resolves falsy', async () => {
    fetchCard.mockResolvedValue(null)
    const hook = mountHook('missing-1', 'en')
    await act(async () => {})
    expect(hook.value).toEqual({ card: null, loading: false, error: true })
    hook.unmount()
  })

  it('serves a second mount for the same card/language from cache without refetching', async () => {
    fetchCard.mockResolvedValue({ id: 'base1-4', name: 'Charizard' })
    const first = mountHook('base1-4', 'en')
    await act(async () => {})
    first.unmount()

    fetchCard.mockClear()
    const second = mountHook('base1-4', 'en')
    expect(second.value).toEqual({ card: { id: 'base1-4', name: 'Charizard' }, loading: false, error: false })
    expect(fetchCard).not.toHaveBeenCalled()
    second.unmount()
  })

  it('returns an idle state when cardId is falsy', () => {
    const hook = mountHook(null, 'en')
    expect(hook.value).toEqual({ card: null, loading: false, error: false })
    expect(fetchCard).not.toHaveBeenCalled()
    hook.unmount()
  })
})
