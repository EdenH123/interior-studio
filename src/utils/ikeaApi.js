// Fetches basic product info from IKEA's CDN-backed search API.
// Falls back gracefully on CORS/network errors — callers always get a
// well-defined shape back, with an `error` field on failure.

const SEARCH_BASE = 'https://sik.search.blue.cdtapps.com'

// Strip dots and spaces to get a raw 8-digit string.
export function normalizeArticleNumber(raw) {
  return String(raw ?? '').replace(/[\s.]/g, '')
}

// Format as the canonical IKEA display format: XXX.XXX.XX
export function formatArticleNumber(raw) {
  const clean = normalizeArticleNumber(raw)
  if (clean.length !== 8) return raw
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`
}

// Parse "77x77 cm", "60x38x64 cm" style strings → metres.
// IKEA uses WxH for 2 numbers and WxDxH for 3.
export function parseDimensions(str) {
  if (!str) return {}
  const m = str.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*cm/i)
  if (!m) return {}
  const [w, b, c] = [parseFloat(m[1]), parseFloat(m[2]), m[3] ? parseFloat(m[3]) : null]
  if (c !== null) return { width: w / 100, depth: b / 100, height: c / 100 }
  return { width: w / 100, height: b / 100 }
}

// Try gb/en first, then us/en — IKEA article numbers are global.
const LOCALES = ['gb/en', 'us/en']

// corsproxy.io passes the response through unchanged — no API key needed.
const CORS_PROXY = 'https://corsproxy.io/?'

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
  if (!res.ok) return null
  return res.json()
}

function parseHit(hit, clean) {
  if (!hit) return null
  const typeName = hit.typeName ?? hit.type ?? ''
  return {
    articleNumber: clean,
    name: hit.name ?? '',
    typeName,
    imageUrl: hit.mainImageHref ?? hit.contextualImageUrl ?? hit.imageHref ?? null,
    ...parseDimensions(typeName),
  }
}

export async function fetchIkeaProduct(articleNumber) {
  const clean = normalizeArticleNumber(articleNumber)
  if (!/^\d{8}$/.test(clean)) {
    return { error: 'invalid', message: 'Enter an 8-digit article number (e.g. 803.518.72)' }
  }

  for (const locale of LOCALES) {
    const searchUrl = `${SEARCH_BASE}/${locale}/search?q=${clean}&types=PRODUCT&size=5`

    // Try direct first; if CORS blocks it, retry through the proxy.
    for (const url of [searchUrl, CORS_PROXY + encodeURIComponent(searchUrl)]) {
      try {
        const data = await fetchJson(url)
        const products = data?.searchResultPage?.productWindow ?? []
        const hit = products.find((p) => normalizeArticleNumber(p.id ?? '') === clean) ?? products[0]
        const result = parseHit(hit, clean)
        if (result) return result
      } catch {
        // continue to next attempt
      }
    }
  }

  return { articleNumber: clean, error: 'unreachable', message: "Couldn't reach IKEA — enter dimensions manually." }
}
