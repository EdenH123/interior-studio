import { useState, useEffect } from 'react'
import { formatMeters } from './constants'
import { getFurnitureSpec } from './furnitureCatalog'

import { FURNITURE_MATERIALS, resolveFurnitureMaterialId } from './furnitureMaterials'
import { getModelStatus, onCacheChange } from '../viewer3d/furnitureModelCache'
import MaterialPicker from './MaterialPicker'

// Properties-panel editor for a selected furniture item. Read-only stats
// for dimensions + position + rotation, plus a material override picker
// (same pattern as Walls and Rooms), plus a 3D model-status row.
//
// Material override applies on top of the catalog default — "Default"
// restores `item.color`, picking a swatch sets `item.material` to that id.
export default function FurnitureProps({ item, onUpdate }) {
  const spec = getFurnitureSpec(item.type)
  // Re-render when any model load state transitions so the Model row updates live.
  const [, bump] = useState(0)
  useEffect(() => onCacheChange(() => bump((v) => v + 1)), [])
  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">{spec?.label ?? item.type}</h3>
      <Row label="ID" value={item.id} />
      <Row label="Type" value={item.type} />
      <Row label="Width" value={`${item.width.toFixed(2)} m`} />
      <Row label="Depth" value={`${item.depth.toFixed(2)} m`} />
      <Row label="Height" value={`${item.height.toFixed(2)} m`} />
      <Row label="Rotation" value={`${item.rotation}°`} />
      <Row label="Position" value={`${formatMeters(item.x)}, ${formatMeters(item.y)}`} />
      <Row label="Model" value={describeModelStatus(item.model)} />
      {item.wallMounted && <MountHeightField item={item} onUpdate={onUpdate} />}

      {item.wallMounted && (
        <div className="mt-3">
          <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">Mount height</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0} max={4} step={0.05}
              value={(item.mountHeight ?? 1.2).toFixed(2)}
              onChange={(e) => onUpdate(item.id, { mountHeight: parseFloat(e.target.value) || 0 })}
              className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs font-mono"
            />
            <span className="text-gray-500 text-[10px]">m above floor</span>
          </div>
        </div>
      )}

      <div className="mt-3">
        <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">Material</div>
        <MaterialPicker
          materials={FURNITURE_MATERIALS}
          currentId={item.material}
          resolveId={resolveFurnitureMaterialId}
          onChange={(id) => onUpdate(item.id, { material: id })}
        />
      </div>

      <p className="text-[10px] text-gray-500 mt-3 leading-snug">
        Drag on canvas to move · drag the blue handle (or R / Shift+R) to rotate · Del to remove. Material override colors the 2D footprint and all 3D meshes (box fallback and loaded GLB).
      </p>
    </div>
  )
}

function MountHeightField({ item, onUpdate }) {
  const [val, setVal] = useState((item.mountHeight ?? 0).toFixed(2))
  useEffect(() => { setVal((item.mountHeight ?? 0).toFixed(2)) }, [item.mountHeight])

  function commit() {
    const m = parseFloat(val)
    if (!isFinite(m) || m < 0 || m > 4) { setVal((item.mountHeight ?? 0).toFixed(2)); return }
    onUpdate(item.id, { mountHeight: Math.round(m * 100) / 100 })
    setVal(m.toFixed(2))
  }

  return (
    <label className="block mt-2">
      <span className="text-gray-500 text-[11px] uppercase tracking-wider">Mount height (m)</span>
      <input
        type="number" step="0.05" min="0" max="4"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); setVal((item.mountHeight ?? 0).toFixed(2)); e.currentTarget.blur() }
        }}
        className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm font-mono focus:border-blue-500 focus:outline-none"
      />
    </label>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 text-[11px] uppercase tracking-wider">{label}</span>
      <span className="text-gray-200 font-mono text-[12px]">{value}</span>
    </div>
  )
}

function describeModelStatus(modelUrl) {
  if (!modelUrl) return 'Box fallback'
  const status = getModelStatus(modelUrl)
  if (status === 'loaded') return 'GLB loaded'
  if (status === 'loading') return 'GLB loading…'
  if (status === 'failed') return 'GLB failed — using box'
  return 'Box fallback'
}
