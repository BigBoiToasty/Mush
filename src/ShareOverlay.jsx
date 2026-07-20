import { useState, useEffect } from 'react'
import { OverlayPanel, NavBtn } from './ui'

export default function ShareOverlay({ getShareToken, setShareToken, onClose }) {
  // null is a valid loaded value (sharing off), so track loading separately
  // instead of using useAsync's data-is-null-while-loading convention.
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

  // Turning sharing off invalidates the link permanently, so it arms on the
  // first tap and only fires on the second.
  const [armedOff, setArmedOff] = useState(false)

  async function handleToggle() {
    if (token && !armedOff) return setArmedOff(true)
    setArmedOff(false)
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
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable (http, old browser) -- the input still selects on tap
    }
  }

  return (
    <OverlayPanel title="Share Binder" onClose={onClose} panelStyle={{ minWidth: 280 }}>
      {loading && <p>Loading...</p>}
      {error && <p className="card-search-error">{error}</p>}

      {!loading && (
        <div className="flex flex-col gap-2">
          {link && (
            <>
              <input
                type="text"
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
                className="w-full rounded border border-gray-400 px-2 py-1 text-base"
              />
              <NavBtn onClick={handleCopy}>{copied ? 'Copied!' : 'Copy Link'}</NavBtn>
            </>
          )}
          <NavBtn danger={!!token && armedOff} disabled={toggling} onClick={handleToggle}>
            {toggling ? '...' : token ? (armedOff ? 'Tap again — link stops working' : 'Turn Off Sharing') : 'Turn On Sharing'}
          </NavBtn>
        </div>
      )}
    </OverlayPanel>
  )
}
