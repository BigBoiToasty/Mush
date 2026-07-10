import { useState, useEffect } from 'react'
import { navButtonClass, navButtonStyle } from './navButton'

export default function BinderStatsOverlay({ getCounts, getWorth, onClose }) {
  const [counts, setCounts] = useState(null)
  const [countsError, setCountsError] = useState(null)
  const [worth, setWorth] = useState(null)
  const [worthError, setWorthError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getCounts()
      .then((result) => {
        if (!cancelled) setCounts(result)
      })
      .catch(() => {
        if (!cancelled) setCountsError("Couldn't load binder info")
      })
    return () => { cancelled = true }
  }, [getCounts])

  useEffect(() => {
    let cancelled = false
    getWorth()
      .then((result) => {
        if (!cancelled) setWorth(result)
      })
      .catch(() => {
        if (!cancelled) setWorthError("Couldn't load prices")
      })
    return () => { cancelled = true }
  }, [getWorth])

  return (
    <div className="card-search-overlay">
      <div className="card-search-bar flex flex-col gap-3" style={{ minWidth: 220 }}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-base font-semibold">Binder Info</span>
          <button type="button" onClick={onClose} className={navButtonClass} style={navButtonStyle}>
            Close
          </button>
        </div>

        {countsError && <p className="card-search-error">{countsError}</p>}
        {!countsError && !counts && <p>Loading...</p>}
        {counts && (
          <div className="flex flex-col gap-1">
            <p>Cards: {counts.cardCount}</p>
            <p>Pages: {counts.pageCount}</p>
            {worthError && <p className="card-search-error">{worthError}</p>}
            {!worthError && worth === null && <p>Worth: Loading...</p>}
            {worth !== null && <p>Worth: ${worth.toFixed(2)}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
