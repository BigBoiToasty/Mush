// localStorage-backed cache for offline binder viewing. Every access is
// wrapped: a quota, parse, or availability failure degrades to live-only
// behavior and never throws into the UI.
const PREFIX = 'mush.'

function get(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw == null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // quota exceeded or storage unavailable -- offline cache is best-effort
  }
}

export const cacheSlots = (binderId, page, slots) => set(`slots.${binderId}.${page}`, slots)
export const readSlots = (binderId, page) => get(`slots.${binderId}.${page}`)

// Every cached page for a binder flattened into one array -- used by offline
// search, which has no single "all slots" key the way a live query would.
export function readAllSlots(binderId) {
  const prefix = `${PREFIX}slots.${binderId}.`
  const slots = []
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(prefix)) continue
      const page = get(key.slice(PREFIX.length))
      if (Array.isArray(page)) slots.push(...page)
    }
  } catch {
    return []
  }
  return slots
}
// Shared-binder view cache (public link, keyed by token) -- lets a shared
// binder still render after the first successful load even if the network is
// gone; the RPC calls behind it are POSTs the service worker won't cache.
export const cacheShared = (token, suffix, value) => set(`shared.${token}.${suffix}`, value)
export const readShared = (token, suffix) => get(`shared.${token}.${suffix}`)

export const cacheBinders = (userId, binders) => set(`binders.${userId}`, binders)
export const readBinders = (userId) => get(`binders.${userId}`)
export const cacheProfile = (userId, profile) => set(`profile.${userId}`, profile)
export const readProfile = (userId) => get(`profile.${userId}`)

// Pending offline writes, replayed by offlineQueue when the network returns.
export const readQueue = () => get('writeQueue') ?? []
export const writeQueue = (ops) => set('writeQueue', ops)
