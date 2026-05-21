// IKEA article number utilities.
// Note: IKEA's product APIs are restricted to IKEA's own infrastructure
// (HTTP 403 "Host not in allowlist" from any external server or proxy).
// Lookup is therefore done manually — we generate a search link so the user
// can quickly open the product page and read the dimensions themselves.

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
