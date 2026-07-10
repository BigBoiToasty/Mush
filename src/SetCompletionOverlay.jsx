import { useState, useEffect } from 'react'
import { navButtonClass, navButtonStyle } from './navButton'
import CardDetailPopup from './CardDetailPopup'

export default function SetCompletionOverlay({ getCompletion, getSetCards, onClose, onAddCard, onGoToPage }) {
  const [sets, setSets] = useState(null)
  const [error, setError] = useState(null)
  const [viewingSet, setViewingSet] = useState(null)
  const [cardsBySetId, setCardsBySetId] = useState({})
  const [cardsLoading, setCardsLoading] = useState(false)
  const [cardsError, setCardsError] = useState(null)
  const [detailCard, setDetailCard] = useState(null)

  useEffect(() => {
    let cancelled = false
    getCompletion()
      .then((result) => {
        if (!cancelled) setSets(result)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load set completion")
      })
    return () => { cancelled = true }
  }, [getCompletion])

  async function handleOpenSet(set) {
    setViewingSet(set)
    if (cardsBySetId[set.setId]) return
    setCardsLoading(true)
    setCardsError(null)
    try {
      const cards = await getSetCards(set.setId, set.language, set.ownedCardPages)
      setCardsBySetId((prev) => ({ ...prev, [set.setId]: cards }))
    } catch {
      setCardsError("Couldn't load set cards")
    }
    setCardsLoading(false)
  }

  return (
    <div className="card-search-overlay">
      <div className="card-search-bar flex flex-col gap-3" style={{ minWidth: 320, maxHeight: '70vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-base font-semibold">Set Completion</span>
          <button type="button" onClick={onClose} className={navButtonClass} style={navButtonStyle}>
            Close
          </button>
        </div>

        {error && <p className="card-search-error">{error}</p>}
        {!error && !sets && <p>Loading...</p>}
        {sets && sets.length === 0 && <p>No sets detected yet.</p>}

        {sets && sets.map((set) => (
          <button
            key={set.setId}
            type="button"
            onClick={() => handleOpenSet(set)}
            className={navButtonClass}
            style={navButtonStyle}
          >
            {set.setName} — {set.ownedCount}/{set.totalCount}
          </button>
        ))}
      </div>

      {viewingSet && (
        <div className="card-search-overlay">
          <div className="card-search-bar flex flex-col gap-3" style={{ minWidth: 320, maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-base font-semibold">
                {viewingSet.setName} — {viewingSet.ownedCount}/{viewingSet.totalCount}
              </span>
              <button type="button" onClick={() => setViewingSet(null)} className={navButtonClass} style={navButtonStyle}>
                Close
              </button>
            </div>

            {cardsLoading && !cardsBySetId[viewingSet.setId] && <p>Loading...</p>}
            {cardsError && <p className="card-search-error">{cardsError}</p>}

            {cardsBySetId[viewingSet.setId] && (
              <div className="card-search-results">
                {cardsBySetId[viewingSet.setId].map((card) => (
                  <div key={card.id} className="find-in-binder-result" style={{ opacity: card.owned ? 1 : 0.4 }}>
                    <button
                      type="button"
                      onClick={() => setDetailCard(card)}
                      className="flex flex-col items-center gap-1"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' }}
                    >
                      <img src={`${card.image}/low.webp`} alt={card.name} />
                      <span>{card.owned ? '✓' : '✗'} {card.name}</span>
                    </button>
                    {card.owned && (
                      card.pages.length > 1 ? (
                        <select
                          defaultValue=""
                          onChange={(e) => onGoToPage(Number(e.target.value))}
                          className="rounded border border-gray-400 px-1 py-0.5 text-base"
                          style={{ background: '#333', color: '#fff' }}
                        >
                          <option value="" disabled>Go to page…</option>
                          {card.pages.map((page) => (
                            <option key={page} value={page}>Page {page}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onGoToPage(card.pages[0])}
                          className={navButtonClass}
                          style={navButtonStyle}
                        >
                          Page {card.pages[0]}
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {detailCard && (
        <CardDetailPopup
          cardId={detailCard.id}
          language={viewingSet.language}
          onClose={() => setDetailCard(null)}
          actions={[
            {
              label: detailCard.owned ? 'Add Another Copy' : 'Add to Binder',
              onClick: (variant) => {
                setDetailCard(null)
                onAddCard({
                  cardId: detailCard.id,
                  cardImage: `${detailCard.image}/high.webp`,
                  cardName: detailCard.name,
                  variant,
                  language: viewingSet.language,
                })
              },
            },
          ]}
        />
      )}
    </div>
  )
}
