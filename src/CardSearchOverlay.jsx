import { useState } from 'react'
import { NavBtn, useDismiss } from './ui'
import { LANGUAGES, searchCards, cardImageUrl } from './tcgdex'
import CardDetailPopup from './CardDetailPopup'

export default function CardSearchOverlay({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('en')
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detailCard, setDetailCard] = useState(null)
  const onBackdropClick = useDismiss(onClose)

  async function handleSearch(e) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    try {
      setResults(await searchCards(trimmed, language))
    } catch (err) {
      console.error('Card search error:', err)
      setError(navigator.onLine
        ? "Couldn't load results"
        : "No internet — you can't add cards right now. Find in Binder still works offline.")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-search-overlay" onClick={onBackdropClick}>
      <form onSubmit={handleSearch} className="card-search-bar flex flex-wrap justify-center gap-2">
        <select
          value={language}
          onChange={(e) => {
            // Results/errors belong to the old language's database; drop them.
            setLanguage(e.target.value)
            setResults([])
            setError(null)
          }}
          className="rounded border border-gray-400 px-2 py-2 text-base"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Pokemon..."
          className="rounded border border-gray-400 px-3 py-2 text-base"
        />
        <NavBtn type="submit" disabled={loading}>{loading ? '...' : 'Search'}</NavBtn>
        <NavBtn onClick={onClose}>Cancel</NavBtn>
      </form>
      {error && <p className="card-search-error">{error}</p>}
      {results.length > 0 && (
        <div className="card-search-results">
          {results.map((card) => (
            <img
              key={card.id}
              src={cardImageUrl(card.image, 'low')}
              loading="lazy"
              decoding="async"
              alt={card.name}
              onClick={() => setDetailCard(card)}
            />
          ))}
        </div>
      )}
      {detailCard && (
        <CardDetailPopup
          cardId={detailCard.id}
          language={language}
          onClose={() => setDetailCard(null)}
          actions={[{
            label: 'Add to Binder',
            onClick: (variant, customFoilType) => {
              onSelect({ cardId: detailCard.id, cardImage: cardImageUrl(detailCard.image), variant, cardName: detailCard.name, language, customFoilType })
              setDetailCard(null)
            },
          }]}
        />
      )}
    </div>
  )
}
