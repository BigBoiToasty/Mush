import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// A genuinely unreachable host can leave a plain fetch() hanging for 10-30s+
// before the browser gives up. Every offline fallback in this app (cached
// binder data, cached search) depends on that fetch rejecting quickly, so cap
// every Supabase request at 5s instead of waiting on the browser's own timeout.
//
// Auth requests (/auth/v1/*) are exempt: processing an OAuth redirect's
// #access_token hash requires one of these calls (GoTrueClient's internal
// getUser) to succeed before the session is saved and the hash is cleared
// from the URL. Aborting that call on a slow-but-working connection leaves
// the user stuck staring at the raw token hash with no session -- worse than
// just letting the browser's own timeout apply, since this is a one-off,
// session-critical call rather than a repeated data fetch.
function fetchWithTimeout(input, init) {
  const url = typeof input === 'string' ? input : input.url
  if (url.includes('/auth/v1/')) return fetch(input, init)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout))
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetchWithTimeout },
})
