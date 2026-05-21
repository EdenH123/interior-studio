// Fetches basic product info from IKEA's search API.
// In dev (npm run dev) requests route through Vite's proxy — no CORS issues.
// In production the direct request is tried, then corsproxy.io as fallback.

const SEARCH_CDN  = 'https://sik.search.blue.cdtapps.com'
const PROXY_PATH  = '/api/ikea-search'          // Vite dev-server proxy
const CORS_PROXY  = 'https://corsproxy.io/?'    // fallback for production

export function normalizeArticleNumber(raw) {
  return String(raw ?? '').replace(/[\s.]/g, '')
}

export function formatArticleNumber(raw) {
  const clean = normalizeArticleNumber(raw)
  if (clean.length !== 8) return raw
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`
}

// Parse "77x77 cm", "60x38x64 cm" → metres. IKEA uses WxH (2 nums) or WxDxH (3 nums).
export function parseDimensions(str) {
  if (!str) return {}
  const m = str.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*cm/i)
  if (!m) return {}
  const [w, b, c] = [parseFloat(m[1]), parseFloat(m[2]), m[3] ? parseFloat(m[3]) : null]
  if (c !== null) return { width: w / 100, depth: b / 100, height: c / 100 }
  return { width: w / 100, height: b / 100 }
}

async function tryFetch(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
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

const LOCALES = ['gb/en', 'us/en']

export async function fetchIkeaProduct(articleNumber) {
  const clean = normalizeArticleNumber(articleNumber)
  if (!/^\d{8}$/.test(clean)) {
    return { error: 'invalid', message: 'Enter an 8-digit article number (e.g. 803.518.72)' }
  }

  for (const locale of LOCALES) {
    const path   = `/${locale}/search?q=${clean}&types=PRODUCT&size=5`
    const direct = `${SEARCH_CDN}${path}`
    const proxy  = `${PROXY_PATH}${path}`
    const cors   = `${CORS_PROXY}${encodeURIComponent(direct)}`

    // Order: Vite proxy (dev) → direct → corsproxy.io (production fallback)
    for (const url of [proxy, direct, cors]) {
      try {
        const data = await tryFetch(url)
        const products = data?.searchResultPage?.productWindow ?? []
        const hit = products.find((p) => normalizeArticleNumber(p.id ?? '') === clean) ?? products[0]
        const result = parseHit(hit, clean)
        if (result) return result
      } catch {
        // try next
      }
    }
  }

  return { articleNumber: clean, error: 'unreachable', message: "Couldn't reach IKEA — enter dimensions manually." }
}
