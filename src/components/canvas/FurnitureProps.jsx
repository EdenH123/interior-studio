import { useState, useEffect } from 'react'
import { formatMeters } from './constants'
import { getFurnitureSpec } from './furnitureCatalog'

import { FURNITURE_MATERIALS, resolveFurnitureMaterialId } from './furnitureMaterials'
import { getModelStatus, onCacheChange } from '../viewer3d/furnitureModelCache'
import MaterialPicker from './MaterialPicker'
import useStore from '../../store/useStore'

// Properties-panel editor for a selected furniture item. Editable dimensions
// (W/D/H) plus read-only stats, material override picker, and 3D model status.
export default function FurnitureProps({ item, onUpdate }) {
  const spec = getFurnitureSpec(item.type)
  const [, bump] = useState(0)
  const locked = useStore((s) => s.lockAspectRatio)
  const setLocked = useStore((s) => s.setLockAspectRatio)
  useEffect(() => onCacheChange(() => bump((v) => v + 1)), [])

  function commitDim(dim, newVal) {
    onUpdate(item.id, locked ? scaleDims(item, dim, newVal) : { [dim]: newVal })
  }

  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">{spec?.label ?? item.label ?? item.type}</h3>
      <Row label="ID" value={item.id} />
      <Row label="Type" value={item.type} />
      <div className="flex justify-between items-center py-1 border-b border-gray-800">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">Dimensions</span>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={locked}
            onChange={(e) => setLocked(e.target.checked)}
            className="w-3 h-3 accent-blue-500"
          />
          <span className="text-gray-500 text-[10px]">lock ratio</span>
        </label>
      </div>
      <DimField label="W" dim="width"  item={item} onCommit={(v) => commitDim('width',  v)} />
      <DimField label="D" dim="depth"  item={item} onCommit={(v) => commitDim('depth',  v)} />
      <DimField label="H" dim="height" item={item} onCommit={(v) => commitDim('height', v)} />
      <Row label="Rotation" value={`${item.rotation}°`} />
      <Row label="Position" value={`${formatMeters(item.x)}, ${formatMeters(item.y)}`} />
      <Row label="Model" value={describeModelStatus(item.model ?? item.customModelId)} />
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

      {spec?.parts?.length > 0 && (
        <div className="mt-3">
          <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-2">Part colors</div>
          <div className="space-y-1.5">
            {spec.parts.map(({ key, label }) => (
              <PartColorRow
                key={key}
                label={label}
                value={item.partColors?.[key] ?? null}
                onChange={(color) => onUpdate(item.id, {
                  partColors: { ...(item.partColors ?? {}), [key]: color || null },
                })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">Global material</div>
        <MaterialPicker
          materials={FURNITURE_MATERIALS}
          currentId={item.material}
          resolveId={resolveFurnitureMaterialId}
          onChange={(id) => onUpdate(item.id, { material: id })}
        />
      </div>

      <p className="text-[10px] text-gray-500 mt-3 leading-snug">
        Part colors override individual sections. Global material sets roughness/finish and tints parts without a color override.
      </p>
    </div>
  )
}

function scaleDims(item, changedDim, newVal) {
  const factor = newVal / item[changedDim]
  const r = (v) => Math.round(v * factor * 100) / 100
  return { width: r(item.width), depth: r(item.depth), height: r(item.height) }
}

function DimField({ label, dim, item, onCommit }) {
  const [val, setVal] = useState(item[dim].toFixed(2))
  useEffect(() => { setVal(item[dim].toFixed(2)) }, [item[dim]])

  function commit() {
    const m = parseFloat(val)
    if (!isFinite(m) || m <= 0) { setVal(item[dim].toFixed(2)); return }
    const rounded = Math.round(m * 100) / 100
    onCommit(rounded)
    setVal(rounded.toFixed(2))
  }

  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-800">
      <span className="text-gray-500 text-[11px] uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number" min="0.01" step="0.01"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  { e.preventDefault(); commit() }
            if (e.key === 'Escape') { e.preventDefault(); setVal(item[dim].toFixed(2)); e.currentTarget.blur() }
          }}
          className="w-16 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-gray-200 text-[12px] font-mono text-right focus:border-blue-500 focus:outline-none"
        />
        <span className="text-gray-500 text-[10px]">m</span>
      </div>
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

function PartColorRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-[11px]">{label}</span>
      <div className="flex items-center gap-1.5">
        <label className="relative cursor-pointer">
          <div
            className="w-5 h-5 rounded border border-gray-600"
            style={{ background: value ?? '#888888' }}
          />
          <input
            type="color"
            value={value ?? '#888888'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </label>
        {value
          ? <button onClick={() => onChange(null)} className="text-gray-500 hover:text-gray-300 text-[10px] leading-none">✕</button>
          : <span className="text-gray-600 text-[10px]">default</span>
        }
      </div>
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
