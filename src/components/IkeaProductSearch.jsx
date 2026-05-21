import { useState, useRef } from 'react'
import useStore from '../store/useStore'
import { searchIkeaCatalog } from '../utils/ikeaCatalog'
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

function SearchForm() {
  const setPendingPlacement = useStore((s) => s.setPendingPlacement)

  const [query,    setQuery]    = useState('')
  const [selected, setSelected] = useState(null)   // catalog item or null
  const [showAll,  setShowAll]  = useState(false)
  const inputRef = useRef(null)

  const results = searchIkeaCatalog(query, 10)
  const showResults = query.trim().length > 0 || showAll

  function pick(item) {
    setSelected(item)
    setQuery(item.n)
    setShowAll(false)
  }

  function handlePlace() {
    if (!selected) return
    const w = selected.w / 100
    const d = selected.d / 100
    const h = selected.h / 100
    const tmpl = TEMPLATES[selected.t] ?? TEMPLATES['sofa']
    const modelUrl = generateModelBlobUrl(selected.t, w, d, h)
    setPendingPlacement({
      type:  `custom-${selected.t}-${Date.now()}`,
      label: selected.n,
      width: w, depth: d, height: h,
      color: tmpl.hex,
      model: modelUrl,
    })
  }

  function handleQueryChange(e) {
    setQuery(e.target.value)
    setSelected(null)
    setShowAll(false)
  }

  return (
    <div className="px-3 pt-2 pb-3 space-y-2">

      {/* Search input */}
      <div className="relative">
        <label className="text-[9px] uppercase tracking-wider text-gray-500 block mb-0.5">
          Search IKEA product
        </label>
        <input
          ref={inputRef}
          type="text"
          placeholder="e.g. KALLAX, MALM bed 140, PAX…"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => { if (!query.trim()) setShowAll(true) }}
          onBlur={() => setTimeout(() => setShowAll(false), 150)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-200 text-xs placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />

        {/* Dropdown results */}
        {showResults && results.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 bg-gray-850 border border-gray-700 rounded-b shadow-lg max-h-52 overflow-y-auto"
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
        {showResults && results.length === 0 && (
          <div className="absolute z-50 left-0 right-0 bg-gray-850 border border-gray-700 rounded-b px-2.5 py-2"
               style={{ top: '100%', backgroundColor: '#1a1f2e' }}>
            <span className="text-[10px] text-gray-500">No results for "{query}"</span>
          </div>
        )}
      </div>

      {/* Selected item summary */}
      {selected && (
        <div className="bg-gray-800 rounded px-2.5 py-2 space-y-0.5">
          <p className="text-xs text-gray-200 font-medium leading-snug">{selected.n}</p>
          <p className="text-[10px] text-gray-400">
            {selected.w} × {selected.d} × {selected.h} cm &nbsp;·&nbsp; {TEMPLATES[selected.t]?.label}
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
