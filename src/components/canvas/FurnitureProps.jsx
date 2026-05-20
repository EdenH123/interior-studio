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
