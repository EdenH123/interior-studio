import { useState } from 'react'
import useStore from '../store/useStore'
import { fetchIkeaProduct, formatArticleNumber, normalizeArticleNumber } from '../utils/ikeaApi'

// Collapsible panel in the sidebar. User enters an IKEA article number
// (e.g. 803.518.72), the app tries IKEA's search API to pre-fill the name
// and dimensions, then the user confirms and clicks "Place on canvas" to
// activate click-to-place mode.
export default function IkeaProductSearch() {
  const [open, setOpen]   = useState(false)
  const pendingPlacement  = useStore((s) => s.pendingPlacement)
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
        <div className="px-3 pb-2 flex items-center justify-between gap-2 bg-blue-950/60">
          <span className="text-[10px] text-blue-300 leading-snug">Click canvas to place "{pendingPlacement.label}"</span>
          <button
            onClick={clearPendingPlacement}
            className="text-[10px] text-gray-400 hover:text-gray-200 shrink-0"
          >
            ✕ Cancel
          </button>
        </div>
      )}

      {open && !pendingPlacement && <SearchForm />}
    </div>
  )
}

function SearchForm() {
  const setPendingPlacement = useStore((s) => s.setPendingPlacement)

  const [article, setArticle]   = useState('')
  const [status,  setStatus]    = useState('idle')  // idle | loading | found | error
  const [message, setMessage]   = useState('')
  const [label,   setLabel]     = useState('')
  const [dims,    setDims]      = useState({ width: '', depth: '', height: '' })

  function handleArticleChange(e) {
    setArticle(e.target.value)
    setStatus('idle')
  }

  async function lookup() {
    const clean = normalizeArticleNumber(article)
    if (!clean) return
    setStatus('loading')
    setMessage('')

    const result = await fetchIkeaProduct(clean)

    if (result.error === 'invalid') {
      setStatus('error')
      setMessage(result.message)
      return
    }

    // Populate what we have, leave blanks for missing fields.
    setLabel(result.name ? `${result.name}${result.typeName ? ' ' + result.typeName : ''}` : '')
    setDims({
      width:  result.width  != null ? String(result.width)  : '',
      depth:  result.depth  != null ? String(result.depth)  : '',
      height: result.height != null ? String(result.height) : '',
    })

    if (result.error) {
      setStatus('error')
      setMessage(result.message ?? 'Enter dimensions manually.')
    } else {
      setStatus('found')
      setArticle(formatArticleNumber(clean))
    }
  }

  function handlePlace() {
    const w = parseFloat(dims.width)
    const d = parseFloat(dims.depth)
    const h = parseFloat(dims.height)
    if (!isFinite(w) || w <= 0) { alert('Enter a valid width.'); return }
    if (!isFinite(d) || d <= 0) { alert('Enter a valid depth.'); return }
    if (!isFinite(h) || h <= 0) { alert('Enter a valid height.'); return }

    const clean = normalizeArticleNumber(article)
    setPendingPlacement({
      type:   `ikea-custom-${clean || 'item'}`,
      label:  label || `IKEA ${clean}`,
      width:  w,
      depth:  d,
      height: h,
      color:  '#e8e4de',
    })
  }

  const canPlace = parseFloat(dims.width) > 0 && parseFloat(dims.depth) > 0 && parseFloat(dims.height) > 0

  return (
    <div className="px-3 pt-1 pb-3 space-y-2">
      {/* Article number row */}
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="803.518.72"
          value={article}
          onChange={handleArticleChange}
          onKeyDown={(e) => { if (e.key === 'Enter') lookup() }}
          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs font-mono placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={lookup}
          disabled={status === 'loading' || !normalizeArticleNumber(article)}
          className="shrink-0 px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
        >
          {status === 'loading' ? '…' : 'Look up'}
        </button>
      </div>

      {/* Status / message */}
      {status === 'error' && (
        <p className="text-[10px] text-amber-400 leading-snug">{message}</p>
      )}
      {status === 'found' && (
        <p className="text-[10px] text-green-400 leading-snug truncate">{label || 'Found'}</p>
      )}

      {/* Name / label field — shown after any lookup attempt or manually */}
      {(status === 'found' || status === 'error') && (
        <input
          type="text"
          placeholder="Product name"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
      )}

      {/* Dimension inputs — shown after any lookup attempt or manually */}
      {(status === 'found' || status === 'error') && (
        <div className="grid grid-cols-3 gap-1">
          {['width', 'depth', 'height'].map((field) => (
            <label key={field} className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-wider text-gray-500">{field[0].toUpperCase()}</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="m"
                value={dims[field]}
                onChange={(e) => setDims((d) => ({ ...d, [field]: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-gray-200 text-xs font-mono focus:border-blue-500 focus:outline-none w-full"
              />
            </label>
          ))}
        </div>
      )}

      {/* Manual entry shortcut — show if user hasn't tried looking up yet */}
      {status === 'idle' && (
        <button
          onClick={() => setStatus('error')}
          className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
        >
          Enter dimensions manually
        </button>
      )}

      {/* Place button */}
      {(status === 'found' || status === 'error') && (
        <button
          onClick={handlePlace}
          disabled={!canPlace}
          className="w-full py-1.5 text-[11px] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors font-medium"
        >
          Place on canvas
        </button>
      )}

      <p className="text-[9px] text-gray-600 leading-snug">
        Dimensions in metres · IKEA sizes in cm ÷ 100
      </p>
    </div>
  )
}
