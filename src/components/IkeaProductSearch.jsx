import { useState } from 'react'
import useStore from '../store/useStore'
import { searchIkeaCatalog } from '../utils/ikeaCatalog'
import { normalizeArticleNumber, fetchIkeaProduct } from '../utils/ikeaApi'
import { getFurnitureSpec } from './canvas/furnitureCatalog'
import { TEMPLATES, generateModelBlobUrl } from '../utils/glbGenerator'

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
        <span>Add custom item</span>
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

function looksLikeCode(v) {
  return /^\d{3}[\s.]?\d{3}[\s.]?\d{2}$/.test(v.trim()) ||
    /^\d{7,8}$/.test(v.replace(/[\s.]/g, ''))
}


function SearchForm() {
  const setPendingPlacement = useStore((s) => s.setPendingPlacement)

  const [query,    setQuery]    = useState('')
  const [selected, setSelected] = useState(null)
  const [dropOpen, setDropOpen] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchErr, setFetchErr] = useState(null)

  const isCode    = looksLikeCode(query)
  const results   = !isCode && query.trim() ? searchIkeaCatalog(query, 10) : []
  const showDrop  = dropOpen && results.length > 0

  function pick(item) {
    setSelected(item)
    setQuery(item.n)
    setDropOpen(false)
    setFetchErr(null)
  }

  async function handleLookup() {
    setFetching(true)
    setFetchErr(null)
    setSelected(null)
    try {
      const p = await fetchIkeaProduct(query)
      if (!p.width || !p.depth || !p.height) {
        setFetchErr(`Found "${p.name}" but dimensions weren't returned. Search by name instead.`)
      } else {
        setSelected({
          n: p.name,
          w: Math.round(p.width),
          d: Math.round(p.depth),
          h: Math.round(p.height),
          t: p.template,
          fType: null,   // fetched items have no pre-built catalog GLB
        })
        setQuery(p.name)
      }
    } catch (e) {
      setFetchErr(e.message)
    } finally {
      setFetching(false)
    }
  }

  function handlePlace() {
    if (!selected) return
    const w = selected.w / 100
    const d = selected.d / 100
    const h = selected.h / 100

    const fSpec = selected.fType ? getFurnitureSpec(selected.fType) : null
    const tmpl  = TEMPLATES[selected.t] ?? TEMPLATES.sofa

    // If there's a catalog spec, set type = fType so CanvasArea can call
    // addFurniture(type) — same path as the sidebar, guaranteed to load the GLB.
    // Otherwise fall back to addFurnitureWithSpec with a browser-generated blob.
    setPendingPlacement({
      type:  fSpec ? selected.fType : `custom-${selected.t}-${Date.now()}`,
      label: selected.n,
      width: w, depth: d, height: h,
      color: fSpec?.color ?? tmpl.hex,
      model: fSpec?.model ?? generateModelBlobUrl(selected.t, w, d, h),
    })
  }

  return (
    <div className="px-3 pt-2 pb-3 space-y-2">

      {/* Search / code input */}
      <div className="relative">
        <label className="text-[9px] uppercase tracking-wider text-gray-500 block mb-0.5">
          {isCode ? 'Article code' : 'Search by name or paste a code'}
        </label>
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="KALLAX 2×2  or  803.518.72"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); setFetchErr(null); setDropOpen(true) }}
            onFocus={() => setDropOpen(true)}
            onBlur={() => setTimeout(() => setDropOpen(false), 150)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-200 text-xs placeholder-gray-600 focus:border-blue-500 focus:outline-none"
          />
          {isCode && (
            <button
              onClick={handleLookup}
              disabled={fetching}
              className="px-2 py-1 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 text-white text-[10px] rounded transition-colors shrink-0"
            >
              {fetching ? '…' : 'Look up'}
            </button>
          )}
        </div>

        {/* Catalog dropdown */}
        {showDrop && (
          <ul className="absolute z-50 left-0 right-0 border border-gray-700 rounded-b shadow-lg max-h-52 overflow-y-auto"
              style={{ top: '100%', backgroundColor: '#1a1f2e' }}>
            {results.map((item, i) => (
              <li key={i}>
                <button
                  onMouseDown={() => pick(item)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-gray-700 transition-colors"
                >
                  <span className="text-xs text-gray-200 block leading-snug">{item.n}</span>
                  <span className="text-[9px] text-gray-500">
                    {item.w} × {item.d} × {item.h} cm
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fetch error */}
      {fetchErr && (
        <p className="text-[9px] text-amber-400 leading-snug">{fetchErr}</p>
      )}

      {/* Selected item summary */}
      {selected && (
        <div className="bg-gray-800 rounded px-2.5 py-2 space-y-0.5">
          <p className="text-xs text-gray-200 font-medium leading-snug">{selected.n}</p>
          <p className="text-[10px] text-gray-400">
            {selected.w} × {selected.d} × {selected.h} cm
            {selected.fType && (
              <span className="text-green-500"> · 3D model ready</span>
            )}
          </p>
        </div>
      )}

      <button
        onClick={handlePlace}
        disabled={!selected}
        className="w-full py-1.5 text-[11px] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors font-medium"
      >
        {selected ? 'Place on canvas' : 'Search a product above'}
      </button>
    </div>
  )
}
