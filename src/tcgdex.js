// TCGdex, the public Pokémon card database the app reads card data and
// images from. Every TCGdex address is built here.

// The same physical card has a different ID per language database, so
// anything keyed by card must be keyed by (language, card_id).
export const cardKey = (language, cardId) => `${language}|${cardId}`

// One shared memory of fetched cards for the whole app (grid, popups,
// Binder Info, Set Completion, backfill). Only successes are kept: a failure
// (offline, flaky API) is retried the next time anything asks, instead of
// being remembered for the rest of the session. Two callers asking for the
// same card at once share one request.
const cardCache = new Map()
const inFlight = new Map()

// TCGdex calls run at most this many at a time, so opening Binder Info on a
// 500-card binder queues the requests instead of firing all 500 at once.
const MAX_PARALLEL = 6
let active = 0
const waiting = []
function limited(task) {
  return new Promise((resolve) => {
    const run = async () => {
      active++
      try {
        resolve(await task())
      } finally {
        active--
        waiting.shift()?.()
      }
    }
    if (active < MAX_PARALLEL) run()
    else waiting.push(run)
  })
}

// Already-fetched card, without a request (undefined if not fetched yet).
export const peekCard = (language, cardId) => cardCache.get(cardKey(language, cardId))

// One card's tcgdex JSON, or null on any failure -- every caller is a
// best-effort path (pricing, rarity, backfill) that degrades gracefully.
export function fetchCard(language, cardId) {
  const key = cardKey(language, cardId)
  if (cardCache.has(key)) return Promise.resolve(cardCache.get(key))
  if (inFlight.has(key)) return inFlight.get(key)
  const request = limited(async () => {
    try {
      const response = await fetch(cardUrl(language, cardId))
      return response.ok ? await response.json() : null
    } catch {
      return null
    }
  }).then((card) => {
    inFlight.delete(key)
    if (card) cardCache.set(key, card)
    return card
  })
  inFlight.set(key, request)
  return request
}

// tcgdex serves each language at its own path and gives the same physical card
// different IDs per language, so every slot stores the language it came from.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh-cn', label: 'Chinese (Simplified)' },
  { code: 'zh-tw', label: 'Chinese (Traditional)' },
]

const LANGUAGE_CODES = new Set(LANGUAGES.map((l) => l.code))

// Allowlist the language before it reaches the URL: it comes from stored rows
// and a search dropdown, so an unexpected value falls back to en rather than
// being interpolated into the request path.
const API = 'https://api.tcgdex.net/v2'
const safeLang = (language) => (LANGUAGE_CODES.has(language) ? language : 'en')

export function cardUrl(language, cardId) {
  return `${API}/${safeLang(language)}/cards/${encodeURIComponent(cardId)}`
}

export function setUrl(language, setId) {
  return `${API}/${safeLang(language)}/sets/${encodeURIComponent(setId)}`
}

// TCGdex gives each card an image base URL; append a size. 'low' (~20 KB) is
// for thumbnails, 'high' (~75 KB) for anything shown large.
export const cardImageUrl = (imageBase, size = 'high') => `${imageBase}/${size}.webp`

// Small version of a stored card image URL, for lists of thumbnails. URLs
// that aren't TCGdex high-res images (e.g. a CSV import) are left as they are.
export const thumbnailUrl = (imageUrl) => imageUrl?.replace(/\/high\.webp$/, '/low.webp')

// True when text contains Japanese kana or CJK ideographs. Lets search tell a
// native-language query (search that language by name directly) from an English
// one (bridge to the target language through the Pokedex number).
export function hasCJK(text) {
  return /[぀-ヿ㐀-鿿豈-﫿ｦ-ﾟ]/.test(text)
}

// tcgdex name search is a "contains" match, so prefer a card whose name equals
// the query exactly (case-insensitive) -- otherwise "Mew" would resolve through
// a Mewtwo card. Falls back to the first result.
export function pickByExactName(cards, name) {
  const lower = name.toLowerCase()
  return cards.find((c) => c.name?.toLowerCase() === lower) ?? cards[0]
}

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

// Resolve an English Pokemon name to its National Pokedex number, so a
// non-English language can be searched by dex (the only key shared across
// languages -- card IDs and names differ). Returns null if unresolvable.
async function resolveDexId(name) {
  const list = await getJson(`${API}/en/cards?name=${encodeURIComponent(name)}`)
  const match = pickByExactName(list, name)
  if (!match) return null
  const full = await getJson(cardUrl('en', match.id))
  return full?.dexId?.[0] ?? null
}

// Card search for the "Add Cards" overlay; only cards with an image. English
// target, or native-script input (e.g. "ピカチュウ"): search that language by
// name directly. English input against a non-English target: bridge through
// the dex number since names don't match across languages.
export async function searchCards(query, language) {
  const lang = safeLang(language)
  let url
  if (lang === 'en' || hasCJK(query)) {
    url = `${API}/${lang}/cards?name=${encodeURIComponent(query)}`
  } else {
    const dexId = await resolveDexId(query)
    if (dexId == null) return []
    url = `${API}/${lang}/cards?dexId=eq:${dexId}`
  }
  const cards = await getJson(url)
  return cards.filter((card) => card.image)
}
