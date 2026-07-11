import { useState } from 'react'
import { navButtonClass, navButtonStyle } from './navButton'
import { LANGUAGES, cardUrl, hasCJK, pickByExactName } from './cards'
import CardDetailPopup from './CardDetailPopup'

// Resolve an English Pokemon name to its National Pokedex number, so a
// non-English language can be searched by dex (the only key shared across
// languages -- card IDs and names differ). Returns null if unresolvable.
async function resolveDexId(name) {
  const res = await fetch(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(name)}`)
  if (!res.ok) throw new Error('Search failed')
  const list = await res.json()
  const match = pickByExactName(list, name)
  if (!match) return null
  const full = await (await fetch(cardUrl('en', match.id))).json()
  return full?.dexId?.[0] ?? null
}

export default function CardSearchOverlay({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('en')
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detailCard, setDetailCard] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    try {
      // English target, or native-script input (e.g. "ピカチュウ"): search that
      // language by name directly. English input against a non-English target:
      // bridge through the dex number since names don't match across languages.
      let url
      if (language === 'en' || hasCJK(trimmed)) {
        url = `https://api.tcgdex.net/v2/${language}/cards?name=${encodeURIComponent(trimmed)}`
      } else {
        const dexId = await resolveDexId(trimmed)
        if (dexId == null) {
          setResults([])
          return
        }
        url = `https://api.tcgdex.net/v2/${language}/cards?dexId=eq:${dexId}`
      }
      const response = await fetch(url)
      if (!response.ok) throw new Error('Search failed')
      const data = await response.json()
      setResults(data.filter((card) => card.image))
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
    <div className="card-search-overlay">
      <form onSubmit={handleSearch} className="card-search-bar flex gap-2">
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
        <button type="submit" disabled={loading} className={navButtonClass} style={navButtonStyle}>
          {loading ? '...' : 'Search'}
        </button>
        <button type="button" onClick={onClose} className={navButtonClass} style={navButtonStyle}>
          Cancel
        </button>
      </form>
      {error && <p className="card-search-error">{error}</p>}
      {results.length > 0 && (
        <div className="card-search-results">
          {results.map((card) => (
            <img
              key={card.id}
              src={`${card.image}/high.webp`}
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
            onClick: (variant) => {
              onSelect({ cardId: detailCard.id, cardImage: `${detailCard.image}/high.webp`, variant, cardName: detailCard.name, language })
              setDetailCard(null)
            },
          }]}
        />
      )}
    </div>
  )
}
