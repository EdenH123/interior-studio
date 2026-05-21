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

  // Strategy 1: IKEA JSON search API via CORS proxies.
  const apiUrl =
    `https://sik.search.blue.cdtapps.com/us/en/search-result-page` +
    `?q=${clean}&size=5&c=lp&types=PRODUCT`

  for (const proxy of [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(apiUrl)}`,
  ]) {
    try {
      const res = await fetch(proxy, { signal: AbortSignal.timeout(8_000) })
      if (res.ok) {
        const data = await res.json()
        const product = parseSearchResult(data, clean)
        if (product) return product
      }
    } catch { /* try next */ }
  }

  // Strategy 2: Fetch IKEA's search HTML page and parse embedded JSON-LD.
  const pageUrl = `https://www.ikea.com/us/en/search/?q=${clean}`
  for (const proxy of [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(pageUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(pageUrl)}`,
  ]) {
    try {
      const res = await fetch(proxy, { signal: AbortSignal.timeout(10_000) })
      if (res.ok) {
        const html = await res.text()
        const product = parseHtmlForProduct(html, clean)
        if (product) return product
      }
    } catch { /* try next */ }
  }

  throw new Error(
    "IKEA's servers blocked this request. Search by product name instead — " +
    'the offline catalog has 120+ products.'
  )
}

function parseSearchResult(data, articleNo) {
  const items = data?.searchResultPage?.products?.main?.items ?? []
  if (!items.length) return null
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
  if (!dim.width) {
    for (const m of p.measurements?.packageMeasurements ?? []) {
      if (m.metricUnit === 'cm') dim[m.type?.toLowerCase()] ??= parseFloat(m.metricValue)
    }
  }
  const name = [p.name, p.typeName].filter(Boolean).join(' ')
  return {
    name,
    typeName: p.typeName ?? '',
    width: dim.width ?? null, depth: dim.depth ?? null, height: dim.height ?? null,
    template: templateFromProduct(name, p.typeName ?? ''),
  }
}

function parseHtmlForProduct(html, articleNo) {
  // Try JSON-LD structured data blocks.
  const jsonLdMatches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] === 'Product') {
          const dim = parseLdDimensions(item)
          if (dim.width && dim.depth && dim.height) {
            const name = item.name ?? ''
            return { name, typeName: '', ...dim, template: templateFromProduct(name, '') }
          }
        }
      }
    } catch { /* ignore invalid JSON */ }
  }
  // Try Next.js page data.
  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (ndMatch) {
    try {
      const nd = JSON.parse(ndMatch[1])
      const products =
        nd?.props?.pageProps?.searchData?.searchResultPage?.products?.main?.items ??
        nd?.props?.pageProps?.products ?? []
      if (products.length) return parseSearchResult({ searchResultPage: { products: { main: { items: products } } } }, articleNo)
    } catch { /* ignore */ }
  }
  return null
}

function parseLdDimensions(item) {
  const depth = parseFloat(item.depth)
  const width = parseFloat(item.width)
  const height = parseFloat(item.height)
  return {
    width:  isFinite(width)  ? width  : null,
    depth:  isFinite(depth)  ? depth  : null,
    height: isFinite(height) ? height : null,
  }
}
