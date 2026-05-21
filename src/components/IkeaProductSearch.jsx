import { useState } from 'react'
import useStore from '../store/useStore'
import {
  normalizeArticleNumber, formatArticleNumber,
  ikeaSearchUrl, parseDimensions,
} from '../utils/ikeaApi'

export default function IkeaProductSearch() {
  const [open, setOpen]       = useState(false)
  const pendingPlacement      = useStore((s) => s.pendingPlacement)
  const clearPendingPlacement = useStore((s) => s.clearPendingPlacement)

  return (
    <div className="border-b border-gray-700">
      <button
        className="w-full flex items-center justify-between px-4 py-2 text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span>IKEA by code</span>
        <span className="text-gray-600">{open ? '▲' : '▼'}</span>
      </button>

      {pendingPlacement && (
        <div className="px-3 py-1.5 flex items-center justify-between gap-2 bg-blue-950/60">
          <span className="text-[10px] text-blue-300 leading-snug truncate">
            Click canvas to place "{pendingPlacement.label}"
          </span>
          <button onClick={clearPendingPlacement} className="text-[10px] text-gray-400 hover:text-gray-200 shrink-0">
            ✕
          </button>
        </div>
      )}

      {open && !pendingPlacement && <SearchForm />}
    </div>
  )
}

function SearchForm() {
  const setPendingPlacement = useStore((s) => s.setPendingPlacement)

  const [article, setArticle] = useState('')
  const [label,   setLabel]   = useState('')
  const [dims,    setDims]    = useState({ width: '', depth: '', height: '' })
  const [dimPaste, setDimPaste] = useState('')
  const [parseMsg, setParseMsg] = useState('')

  const clean   = normalizeArticleNumber(article)
  const isValid = /^\d{8}$/.test(clean)
  const searchUrl = isValid ? ikeaSearchUrl(clean) : null

  function handleArticleBlur() {
    if (isValid) setArticle(formatArticleNumber(clean))
  }

  // Allow pasting "Width: 77 cm, Depth: 39 cm, Height: 77 cm" or "77x39x77 cm"
  function handleDimPaste(e) {
    const raw = e.target.value
    setDimPaste(raw)
    const parsed = parseDimensions(raw)
    if (parsed) {
      setDims({
        width:  parsed.width  != null ? String(parsed.width)  : dims.width,
        depth:  parsed.depth  != null ? String(parsed.depth)  : dims.depth,
        height: parsed.height != null ? String(parsed.height) : dims.height,
      })
      setParseMsg('✓ Dimensions parsed')
    } else {
      setParseMsg('')
    }
  }

  function handlePlace() {
    const w = parseFloat(dims.width)
    const d = parseFloat(dims.depth)
    const h = parseFloat(dims.height)
    if (!isFinite(w) || w <= 0) { alert('Enter a valid width (metres).'); return }
    if (!isFinite(d) || d <= 0) { alert('Enter a valid depth (metres).'); return }
    if (!isFinite(h) || h <= 0) { alert('Enter a valid height (metres).'); return }

    setPendingPlacement({
      type:   `ikea-custom-${clean || 'item'}`,
      label:  label || (isValid ? `IKEA ${formatArticleNumber(clean)}` : 'Custom item'),
      width: w, depth: d, height: h,
      color: '#e8e4de',
    })
  }

  const canPlace = parseFloat(dims.width) > 0 && parseFloat(dims.depth) > 0 && parseFloat(dims.height) > 0

  return (
    <div className="px-3 pt-1 pb-3 space-y-2">
      {/* Article number */}
      <div>
        <label className="text-[9px] uppercase tracking-wider text-gray-500 block mb-0.5">Article #</label>
        <input
          type="text"
          placeholder="803.518.72"
          value={article}
          onChange={(e) => setArticle(e.target.value)}
          onBlur={handleArticleBlur}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs font-mono placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* IKEA link — shown once 8 digits entered */}
      {searchUrl && (
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span>↗</span>
          <span>Open on IKEA.com — copy dimensions from there</span>
        </a>
      )}

      {/* Product name */}
      <div>
        <label className="text-[9px] uppercase tracking-wider text-gray-500 block mb-0.5">Name</label>
        <input
          type="text"
          placeholder="e.g. KALLAX Shelf unit"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Quick-paste dimension string */}
      <div>
        <label className="text-[9px] uppercase tracking-wider text-gray-500 block mb-0.5">
          Paste dimensions <span className="normal-case text-gray-600">(e.g. 77×39×77 cm)</span>
        </label>
        <input
          type="text"
          placeholder="77×39×77 cm"
          value={dimPaste}
          onChange={handleDimPaste}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs font-mono placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
        {parseMsg && <p className="text-[9px] text-green-400 mt-0.5">{parseMsg}</p>}
      </div>

      {/* W / D / H inputs in metres */}
      <div className="grid grid-cols-3 gap-1">
        {['width', 'depth', 'height'].map((field) => (
          <label key={field} className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-wider text-gray-500">{field[0].toUpperCase()} (m)</span>
            <input
              type="number" step="0.01" min="0.01"
              placeholder="0.00"
              value={dims[field]}
              onChange={(e) => setDims((d) => ({ ...d, [field]: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-gray-200 text-xs font-mono focus:border-blue-500 focus:outline-none w-full"
            />
          </label>
        ))}
      </div>

      <p className="text-[9px] text-gray-600 leading-snug">
        IKEA sizes are in cm — divide by 100 for metres (e.g. 77 cm = 0.77 m)
      </p>

      <button
        onClick={handlePlace}
        disabled={!canPlace}
        className="w-full py-1.5 text-[11px] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors font-medium"
      >
        Place on canvas
      </button>
    </div>
  )
}
