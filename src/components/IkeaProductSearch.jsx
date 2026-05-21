import { useState } from 'react'
import useStore from '../store/useStore'
import { parseDimensions } from '../utils/ikeaApi'
import { TEMPLATES, generateModelBlobUrl } from '../utils/glbGenerator'

const TEMPLATE_KEYS = Object.keys(TEMPLATES)

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
        <span>Custom item</span>
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

      {open && !pendingPlacement && <PlaceForm />}
    </div>
  )
}

function PlaceForm() {
  const setPendingPlacement = useStore((s) => s.setPendingPlacement)

  const [label,    setLabel]    = useState('')
  const [template, setTemplate] = useState('sofa')
  const [dims,     setDims]     = useState({ width: '', depth: '', height: '' })
  const [dimPaste, setDimPaste] = useState('')
  const [parseMsg, setParseMsg] = useState('')

  function handleDimPaste(e) {
    const raw = e.target.value
    setDimPaste(raw)
    const parsed = parseDimensions(raw)
    if (parsed) {
      setDims({
        width:  parsed.width  != null ? String(Math.round(parsed.width  * 100)) : dims.width,
        depth:  parsed.depth  != null ? String(Math.round(parsed.depth  * 100)) : dims.depth,
        height: parsed.height != null ? String(Math.round(parsed.height * 100)) : dims.height,
      })
      setParseMsg('✓ Dimensions parsed')
    } else {
      setParseMsg('')
    }
  }

  function handlePlace() {
    const wCm = parseFloat(dims.width)
    const dCm = parseFloat(dims.depth)
    const hCm = parseFloat(dims.height)
    if (!isFinite(wCm) || wCm <= 0) { alert('Enter a valid width (cm).'); return }
    if (!isFinite(dCm) || dCm <= 0) { alert('Enter a valid depth (cm).'); return }
    if (!isFinite(hCm) || hCm <= 0) { alert('Enter a valid height (cm).'); return }

    const w = wCm / 100
    const d = dCm / 100
    const h = hCm / 100

    const tmpl    = TEMPLATES[template]
    const modelUrl = generateModelBlobUrl(template, w, d, h)
    const name    = label.trim() || tmpl.label

    setPendingPlacement({
      type:  `custom-${template}-${Date.now()}`,
      label: name,
      width: w, depth: d, height: h,
      color: tmpl.hex,
      model: modelUrl,
    })
  }

  const canPlace = parseFloat(dims.width) > 0 && parseFloat(dims.depth) > 0 && parseFloat(dims.height) > 0

  return (
    <div className="px-3 pt-1 pb-3 space-y-2">

      {/* Template type */}
      <div>
        <label className="text-[9px] uppercase tracking-wider text-gray-500 block mb-1">Shape</label>
        <div className="grid grid-cols-4 gap-1">
          {TEMPLATE_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setTemplate(key)}
              className={`py-1 px-1 rounded text-[9px] text-center transition-colors ${
                template === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {TEMPLATES[key].label.split(' ')[0]}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-gray-600 mt-0.5">{TEMPLATES[template].label}</p>
      </div>

      {/* Product name */}
      <div>
        <label className="text-[9px] uppercase tracking-wider text-gray-500 block mb-0.5">Name <span className="normal-case text-gray-600">(optional)</span></label>
        <input
          type="text"
          placeholder={TEMPLATES[template].label}
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

      {/* W / D / H inputs in cm */}
      <div className="grid grid-cols-3 gap-1">
        {['width', 'depth', 'height'].map((field) => (
          <label key={field} className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-wider text-gray-500">{field[0].toUpperCase()} (cm)</span>
            <input
              type="number" step="1" min="1"
              placeholder="0"
              value={dims[field]}
              onChange={(e) => setDims((d) => ({ ...d, [field]: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-gray-200 text-xs font-mono focus:border-blue-500 focus:outline-none w-full"
            />
          </label>
        ))}
      </div>

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
