import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// A genuinely unreachable host can leave a plain fetch() hanging for 10-30s+
// before the browser gives up. Every offline fallback in this app (cached
// binder data, cached search) depends on that fetch rejecting quickly, so cap
// every Supabase request at 5s instead of waiting on the browser's own timeout.
function fetchWithTimeout(input, init) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout))
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetchWithTimeout },
})
