import { useState } from 'react'
import { nanoid } from 'nanoid/non-secure'
import useStore from '../store/useStore'
import { arrayBufferToBase64 } from '../utils/customModelUrls'
import { boxPrim, cylPrim, hexToLinear, writeGLB } from '../utils/glbWriter'

const DEFAULT_COLOR = '#7c9ab5'

function makePart(type) {
  return {
    id: nanoid(4),
    type,
    w: type === 'cyl' ? 0.06 : 0.80,
    d: type === 'box' ? 0.40 : undefined,
    h: type === 'cyl' ? 0.42 : 0.45,
    ox: 0, oy: 0, oz: 0,
    color: DEFAULT_COLOR,
  }
}

export default function CreateModelModal({ onClose }) {
  const addCustomModel = useStore((s) => s.addCustomModel)
  const [label, setLabel]     = useState('My Model')
  const [tileColor, setTileColor] = useState(DEFAULT_COLOR)
  const [parts, setParts]     = useState([makePart('box')])
  const [error, setError]     = useState(null)

  function addPart(type) {
    setParts((p) => [...p, makePart(type)])
  }

  function updatePart(id, key, raw) {
    const val = ['type', 'color'].includes(key) ? raw : (parseFloat(raw) || 0)
    setParts((p) => p.map((pt) => pt.id === id ? { ...pt, [key]: val } : pt))
  }

  function removePart(id) {
    setParts((p) => p.filter((pt) => pt.id !== id))
  }

  function handleCreate() {
    if (!label.trim())   { setError('Enter a name.'); return }
    if (parts.length === 0) { setError('Add at least one part.'); return }

    const groups = parts.map((pt) => {
      const [lr, lg, lb] = hexToLinear(pt.color)
      const geom = pt.type === 'box'
        ? boxPrim(pt.ox - pt.w / 2, pt.oy, pt.oz - (pt.d ?? pt.w) / 2,
                  pt.ox + pt.w / 2, pt.oy + pt.h, pt.oz + (pt.d ?? pt.w) / 2)
        : cylPrim(pt.ox, pt.oz, pt.oy, pt.oy + pt.h, pt.w / 2)
      return { parts: [geom], color: [lr, lg, lb, 1], roughness: 0.75, metallic: 0 }
    })

    // Compute bounding box from part dimensions
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxY = 0
    for (const pt of parts) {
      const hw = pt.w / 2, hd = (pt.type === 'box' ? (pt.d ?? pt.w) : pt.w) / 2
      minX = Math.min(minX, pt.ox - hw); maxX = Math.max(maxX, pt.ox + hw)
      minZ = Math.min(minZ, pt.oz - hd); maxZ = Math.max(maxZ, pt.oz + hd)
      maxY = Math.max(maxY, pt.oy + pt.h)
    }

    const buffer = writeGLB(groups)
    addCustomModel({
      label: label.trim(),
      width:  Math.max(0.01, maxX - minX),
      depth:  Math.max(0.01, maxZ - minZ),
      height: Math.max(0.01, maxY),
      color: tileColor,
      glbData: arrayBufferToBase64(buffer),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[500px] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
          <h2 className="text-gray-200 text-sm font-semibold">Create 3D Model</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name */}
          <label className="flex flex-col gap-1">
            <span className="text-gray-500 text-[11px] uppercase tracking-wider">Name</span>
            <input
              type="text" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="Coffee Table"
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-200 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>

          {/* Parts list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-[11px] uppercase tracking-wider">Parts</span>
              <span className="text-[10px] text-gray-600">Y = up · X/Z = horizontal</span>
            </div>
            <div className="space-y-2">
              {parts.map((pt, i) => (
                <PartRow
                  key={pt.id}
                  part={pt}
                  index={i}
                  onChange={(key, val) => updatePart(pt.id, key, val)}
                  onRemove={() => removePart(pt.id)}
                  canRemove={parts.length > 1}
                />
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="button" onClick={() => addPart('box')}
                className="text-[11px] px-2.5 py-1 rounded border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors"
              >
                + Box
              </button>
              <button
                type="button" onClick={() => addPart('cyl')}
                className="text-[11px] px-2.5 py-1 rounded border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors"
              >
                + Cylinder
              </button>
            </div>
          </div>

          {/* Tile color */}
          <label className="flex items-center gap-3">
            <span className="text-gray-500 text-[11px] uppercase tracking-wider">Sidebar tile color</span>
            <div className="relative">
              <div className="w-6 h-6 rounded border border-gray-600" style={{ background: tileColor }} />
              <input type="color" value={tileColor} onChange={(e) => setTileColor(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
            </div>
            <span className="text-gray-500 text-[11px] font-mono">{tileColor}</span>
          </label>

          {error && <p className="text-red-400 text-[11px]">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-700 shrink-0">
          <button onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={parts.length === 0}
            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors">
            Create & Add to Library
          </button>
        </div>
      </div>
    </div>
  )
}

function PartRow({ part, index, onChange, onRemove, canRemove }) {
  const isBox = part.type === 'box'

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        {/* Type */}
        <select
          value={part.type}
          onChange={(e) => onChange('type', e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-1.5 py-1 text-gray-200 text-[11px] focus:outline-none"
        >
          <option value="box">Box</option>
          <option value="cyl">Cylinder</option>
        </select>

        {/* Dimensions */}
        <div className="flex gap-1.5 flex-1">
          <DimField label="W" value={part.w} onChange={(v) => onChange('w', v)} />
          {isBox && <DimField label="D" value={part.d ?? part.w} onChange={(v) => onChange('d', v)} />}
          <DimField label="H" value={part.h} onChange={(v) => onChange('h', v)} />
        </div>

        {/* Color */}
        <div className="relative shrink-0">
          <div className="w-5 h-5 rounded border border-gray-600 cursor-pointer" style={{ background: part.color }} />
          <input type="color" value={part.color} onChange={(e) => onChange('color', e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
        </div>

        {/* Remove */}
        <button onClick={onRemove} disabled={!canRemove}
          className="text-gray-600 hover:text-red-400 disabled:opacity-20 text-sm leading-none shrink-0 transition-colors">
          ×
        </button>
      </div>

      {/* Offsets */}
      <div className="flex gap-1.5">
        <DimField label="X" value={part.ox} onChange={(v) => onChange('ox', v)} signed />
        <DimField label="Y" value={part.oy} onChange={(v) => onChange('oy', v)} signed />
        <DimField label="Z" value={part.oz} onChange={(v) => onChange('oz', v)} signed />
        <span className="text-[10px] text-gray-600 self-end pb-0.5 ml-1">offset</span>
      </div>
    </div>
  )
}

function DimField({ label, value, onChange, signed = false }) {
  return (
    <label className="flex flex-col gap-0.5 w-14">
      <span className="text-gray-600 text-[10px]">{label}</span>
      <input
        type="number" min={signed ? undefined : 0.001} step="0.01" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-gray-200 text-[11px] font-mono focus:border-blue-500 focus:outline-none w-full"
      />
    </label>
  )
}
