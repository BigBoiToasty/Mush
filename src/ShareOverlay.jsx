import { useState, useEffect } from 'react'
import { navButtonClass, navButtonStyle } from './navButton'

export default function ShareOverlay({ getShareToken, setShareToken, onClose }) {
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    let cancelled = false
    getShareToken()
      .then((result) => {
        if (cancelled) return
        setToken(result)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError("Couldn't load sharing status")
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [getShareToken])

  async function handleToggle() {
    setToggling(true)
    setError(null)
    const next = token ? null : crypto.randomUUID()
    try {
      await setShareToken(next)
      setToken(next)
    } catch {
      setError("Couldn't update sharing. Please try again.")
    }
    setToggling(false)
  }

  const link = token ? `${window.location.origin}${window.location.pathname}?share=${token}` : null

  return (
    <div className="card-search-overlay">
      <div className="card-search-bar flex flex-col gap-3" style={{ minWidth: 280 }}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-base font-semibold">Share Binder</span>
          <button type="button" onClick={onClose} className={navButtonClass} style={navButtonStyle}>
            Close
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="card-search-error">{error}</p>}

        {!loading && (
          <div className="flex flex-col gap-2">
            {link && (
              <input
                type="text"
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
                className="w-full rounded border border-gray-400 px-2 py-1 text-base"
              />
            )}
            <button type="button" disabled={toggling} onClick={handleToggle} className={navButtonClass} style={navButtonStyle}>
              {toggling ? '...' : token ? 'Turn Off Sharing' : 'Turn On Sharing'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
