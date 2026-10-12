import { useEffect, useRef } from 'react'

// Cloudflare Turnstile site key. Public by design (it ships in the bundle);
// the matching secret lives only in the Supabase server's .env. Unset in dev,
// in which case no widget renders and auth calls go out without a token.
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// One shared script load no matter how many times the widget mounts.
let scriptPromise
function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve(window.turnstile)
    s.onerror = () => { scriptPromise = undefined; reject(new Error('Turnstile failed to load')) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

// Renders the widget and reports its token through onToken (null when it
// expires or errors). A token is single-use: bump resetKey after every
// sign-in/sign-up attempt so the widget fetches a fresh one.
export default function Turnstile({ onToken, resetKey }) {
  const boxRef = useRef(null)
  const widgetRef = useRef(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    let cancelled = false
    loadScript()
      .then((turnstile) => {
        if (cancelled || !boxRef.current) return
        widgetRef.current = turnstile.render(boxRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          appearance: 'always', // always show the widget (owner wants it visible for now)
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch(() => onTokenRef.current(null))
    return () => {
      cancelled = true
      if (widgetRef.current != null) window.turnstile?.remove(widgetRef.current)
      widgetRef.current = null
    }
  }, [])

  useEffect(() => {
    if (resetKey && widgetRef.current != null) {
      onTokenRef.current(null)
      window.turnstile?.reset(widgetRef.current)
    }
  }, [resetKey])

  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={boxRef} />
}
