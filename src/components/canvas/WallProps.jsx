import { useState } from 'react'
import { formatMeters, PIXELS_PER_METER } from './constants'
import { WALL_MATERIALS } from './wallMaterials'
import Swatch from './Swatch'

// Properties-panel editor for a selected wall. The length is editable as
// meters; committing the edit recomputes the second endpoint along the
// wall's current direction while keeping the first endpoint fixed.
//
// Local input state is keyed to a single wall instance — PropertiesPanel
// passes `key={wall.id}` so a fresh component (and fresh `useState`
// initial value) mount whenever the selected wall changes.
export default function WallProps({ wall, onUpdate }) {
  const dx = wall.x2 - wall.x1
  const dy = wall.y2 - wall.y1
  const currentPx = Math.hypot(dx, dy)
  const currentM = currentPx / PIXELS_PER_METER
  const [value, setValue] = useState(currentM.toFixed(2))

  const commit = () => {
    const m = parseFloat(value)
    if (!isFinite(m) || m < 0.05) {
      setValue(currentM.toFixed(2))
      return
    }
    if (currentPx < 1) return // degenerate wall, no direction to extend along
    const ux = dx / currentPx
    const uy = dy / currentPx
    const newPx = m * PIXELS_PER_METER
    onUpdate(wall.id, { x2: wall.x1 + ux * newPx, y2: wall.y1 + uy * newPx })
    setValue(m.toFixed(2))
  }

  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">Wall</h3>
      <Row label="ID" value={wall.id} />
      <label className="block mt-2">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">Length (m)</span>
        <input
          type="number" step="0.01" min="0.05"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit() }
            if (e.key === 'Escape') {
              e.preventDefault()
              setValue(currentM.toFixed(2))
              e.currentTarget.blur()
            }
          }}
          className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm font-mono focus:border-blue-500 focus:outline-none"
        />
      </label>
      <p className="text-[10px] text-gray-500 mt-2 leading-snug">
        Keeps the first endpoint fixed and moves the second along the wall's direction. Enter to apply · Esc to revert.
      </p>
      <div className="mt-3">
        <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">Material</div>
        <div className="grid grid-cols-3 gap-1.5">
          <Swatch label="Default" color={null} active={!wall.material}
            onClick={() => onUpdate(wall.id, { material: null })} />
          {WALL_MATERIALS.map((m) => (
            <Swatch key={m.id} label={m.label} color={m.color}
              active={wall.material === m.id}
              onClick={() => onUpdate(wall.id, { material: m.id })} />
          ))}
        </div>
      </div>
      <div className="mt-3">
        <Row label="From" value={`${formatMeters(wall.x1)}, ${formatMeters(wall.y1)}`} />
        <Row label="To" value={`${formatMeters(wall.x2)}, ${formatMeters(wall.y2)}`} />
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
