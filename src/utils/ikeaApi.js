// IKEA article number utilities + live product lookup.
// IKEA's direct APIs block external IPs (HTTP 403), so lookups are proxied
// through public CORS proxies. Falls back gracefully if all proxies fail.

export function normalizeArticleNumber(raw) {
  return String(raw ?? '').replace(/[\s.]/g, '')
}

export function formatArticleNumber(raw) {
  const clean = normalizeArticleNumber(raw)
  if (clean.length !== 8) return raw
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`
}

// Returns the IKEA search URL for a given article number.
export function ikeaSearchUrl(articleNumber) {
  const clean = normalizeArticleNumber(articleNumber)
  return `https://www.ikea.com/search/?q=${clean}`
}

// Parse "77x77 cm", "60x38x64 cm" → metres. Useful when the user pastes
// a dimension string copied from IKEA's product page.
export function parseDimensions(str) {
  if (!str) return null
  const m = str.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*cm/i)
  if (!m) return null
  const [w, b, c] = [parseFloat(m[1]), parseFloat(m[2]), m[3] ? parseFloat(m[3]) : null]
  if (c !== null) return { width: w / 100, depth: b / 100, height: c / 100 }
  return { width: w / 100, height: b / 100 }
}

// ─── Live product lookup ──────────────────────────────────────────────────────

const PROXIES = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
]

// Detects the best furniture template from the product name + type name.
export function templateFromProduct(name = '', typeName = '') {
  const s = `${name} ${typeName}`.toLowerCase()
  if (/sofa|couch|loveseat|sectional/.test(s))               return 'sofa'
  if (/armchair|recliner|wing.chair|lounge.chair/.test(s))   return 'armchair'
  if (/\bbed\b|daybed/.test(s))                              return 'bed'
  if (/wardrobe|closet|armoire|\bpax\b/.test(s))             return 'wardrobe'
  if (/shelf|shelving|bookcase|kallax|billy|trofast|ivar/.test(s)) return 'shelving'
  if (/chest|drawer|dresser|nightstand|bedside|cabinet/.test(s))   return 'cabinet'
  if (/table|desk|bench/.test(s))                            return 'table'
  return 'stool'
}

// Fetch product info for an 8-digit IKEA article number.
// Returns { name, typeName, width, depth, height, template } on success,
// or throws with a human-readable message.
export async function fetchIkeaProduct(articleNo) {
  const clean = normalizeArticleNumber(articleNo)
  if (!/^\d{8}$/.test(clean)) throw new Error('Enter a valid 8-digit article number.')

  const apiUrl =
    `https://sik.search.blue.cdtapps.com/us/en/search-result-page` +
    `?q=${clean}&size=5&c=lp&types=PRODUCT`

  let lastErr = null
  for (const makeProxy of PROXIES) {
    try {
      const res = await fetch(makeProxy(apiUrl), { signal: AbortSignal.timeout(10_000) })
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue }
      const data = await res.json()
      const product = parseSearchResult(data, clean)
      if (product) return product
      throw new Error('Product not found for that article number.')
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('Could not reach IKEA. Try a different network.')
}

function parseSearchResult(data, articleNo) {
  const items = data?.searchResultPage?.products?.main?.items ?? []
  if (!items.length) return null
  // Prefer exact article-number match, fall back to first result.
  const match =
    items.find((i) => normalizeArticleNumber(i.product?.id ?? '') === articleNo) ??
    items[0]
  const p = match?.product
  if (!p) return null

  const refs = p.measurements?.referenceMeasurements ?? []
  const dim = {}
  for (const m of refs) {
    if (m.metricUnit === 'cm') dim[m.type?.toLowerCase()] = parseFloat(m.metricValue)
  }
  // Some responses nest measurements differently — try alternate paths.
  if (!dim.width) {
    const alt = p.measurements?.packageMeasurements ?? []
    for (const m of alt) {
      if (m.metricUnit === 'cm') dim[m.type?.toLowerCase()] ??= parseFloat(m.metricValue)
    }
  }

  const name     = [p.name, p.typeName].filter(Boolean).join(' ')
  const typeName = p.typeName ?? ''
  return {
    name,
    typeName,
    width:    dim.width  ?? null,
    depth:    dim.depth  ?? null,
    height:   dim.height ?? null,
    template: templateFromProduct(name, typeName),
  }
}
