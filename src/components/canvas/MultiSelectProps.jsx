import { useState } from 'react'
import { FURNITURE_MATERIALS, resolveFurnitureMaterialId } from './furnitureMaterials'
import MaterialPicker from './MaterialPicker'

// Properties panel shown when multiple items are selected.
// If all selected items share the same kind, shows editable common fields.
// For multiple furniture: rotation (applied to all) + material picker.
export default function MultiSelectProps({ items, kind, furniture, updateFurniture }) {
  const count = items.length

  if (kind === 'furniture') {
    return <MultiFurnitureProps
      ids={items.map((i) => i.id)}
      furniture={furniture}
      updateFurniture={updateFurniture}
    />
  }

  const breakdown = items.reduce((acc, { kind: k }) => {
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <p className="text-gray-400 text-xs mb-3">{count} items selected</p>
      <div className="space-y-1">
        {Object.entries(breakdown).map(([k, n]) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-gray-500 capitalize">{k}s</span>
            <span className="text-gray-300 font-mono">{n}</span>
          </div>
        ))}
      </div>
      <p className="text-gray-600 text-[11px] mt-3">Select items of the same type to edit shared properties.</p>
    </div>
  )
}

function MultiFurnitureProps({ ids, furniture, updateFurniture }) {
  const furnitureItems = ids.map((id) => furniture.find((f) => f.id === id)).filter(Boolean)
  const rotations = [...new Set(furnitureItems.map((f) => f.rotation))]
  const [rotInput, setRotInput] = useState(rotations.length === 1 ? String(rotations[0]) : '')
  const materials = [...new Set(furnitureItems.map((f) => f.material ?? null))]
  const commonMaterial = materials.length === 1 ? materials[0] : undefined

  const applyRotation = (raw) => {
    const deg = parseInt(raw, 10)
    if (!isNaN(deg)) {
      const norm = ((deg % 360) + 360) % 360
      furnitureItems.forEach((f) => updateFurniture(f.id, { rotation: norm }))
      setRotInput(String(norm))
    }
  }

  return (
    <div>
      <p className="text-gray-400 text-xs mb-3">{ids.length} furniture items</p>
      <label className="block mb-3">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">Rotation (all)</span>
        <input
          type="number"
          value={rotInput}
          onChange={(e) => setRotInput(e.target.value)}
          onBlur={(e) => applyRotation(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyRotation(e.target.value) }}
          placeholder={rotations.length > 1 ? 'mixed' : '0'}
          className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">Material (all)</div>
      <MaterialPicker
        materials={FURNITURE_MATERIALS}
        currentId={commonMaterial === undefined ? null : commonMaterial}
        resolveId={resolveFurnitureMaterialId}
        onChange={(id) => furnitureItems.forEach((f) => updateFurniture(f.id, { material: id }))}
      />
    </div>
  )
}
