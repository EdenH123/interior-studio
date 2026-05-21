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

export async function fetchIkeaProduct(articleNumber) {
  const clean = normalizeArticleNumber(articleNumber)
  if (!/^\d{8}$/.test(clean)) {
    return { error: 'invalid', message: 'Enter an 8-digit article number (e.g. 803.518.72)' }
  }

  for (const locale of LOCALES) {
    try {
      const url = `${SEARCH_BASE}/${locale}/search?q=${clean}&types=PRODUCT&size=5`
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
      if (!res.ok) continue
      const data = await res.json()

      const products = data?.searchResultPage?.productWindow ?? []
      // Prefer exact article-number match; fall back to first result.
      const hit = products.find((p) => normalizeArticleNumber(p.id ?? '') === clean) ?? products[0]
      if (!hit) continue

      const typeName = hit.typeName ?? hit.type ?? ''
      const dims = parseDimensions(typeName)
      return {
        articleNumber: clean,
        name: hit.name ?? '',
        typeName,
        imageUrl: hit.mainImageHref ?? hit.contextualImageUrl ?? hit.imageHref ?? null,
        ...dims,
      }
    } catch {
      // CORS or network — try next locale
    }
  }

  // All locales failed — return article number so the form can still be filled in.
  return { articleNumber: clean, error: 'unreachable', message: "Couldn't reach IKEA — enter dimensions manually." }
}
