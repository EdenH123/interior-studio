import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatMeters, PIXELS_PER_METER } from './constants'
import { WALL_MATERIALS, resolveWallMaterialId } from './wallMaterials'
import MaterialPicker from './MaterialPicker'

export default function WallProps({ wall, onUpdate }) {
  const { t } = useTranslation()
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
    if (currentPx < 1) return
    const ux = dx / currentPx
    const uy = dy / currentPx
    const newPx = m * PIXELS_PER_METER
    onUpdate(wall.id, { x2: wall.x1 + ux * newPx, y2: wall.y1 + uy * newPx })
    setValue(m.toFixed(2))
  }

  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">{t('wall.title')}</h3>
      <Row label={t('wall.id')} value={wall.id} />
      <label className="block mt-2">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('wall.length')}</span>
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
          dir="ltr"
          className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm font-mono focus:border-blue-500 focus:outline-none"
        />
      </label>
      <NumField
        label={t('wall.height')} step={0.1} min={0.5} max={6.0}
        initial={(wall.height ?? 2.4).toFixed(1)}
        onCommit={(v) => onUpdate(wall.id, { height: v })}
      />
      <NumField
        label={t('wall.thickness')} step={0.05} min={0.05} max={1.0}
        initial={(wall.thickness ?? 0.2).toFixed(2)}
        onCommit={(v) => onUpdate(wall.id, { thickness: v })}
      />
      <p className="text-[10px] text-gray-500 mt-2 leading-snug">{t('wall.hint')}</p>
      <div className="mt-3">
        <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">{t('wall.material')}</div>
        <MaterialPicker
          materials={WALL_MATERIALS}
          currentId={wall.material}
          resolveId={resolveWallMaterialId}
          onChange={(id) => onUpdate(wall.id, { material: id })}
        />
      </div>
      <div className="mt-3">
        <Row label={t('wall.from')} value={`${formatMeters(wall.x1)}, ${formatMeters(wall.y1)}`} />
        <Row label={t('wall.to')} value={`${formatMeters(wall.x2)}, ${formatMeters(wall.y2)}`} />
      </div>
    </div>
  )
}

function NumField({ label, step, min, max, initial, onCommit }) {
  const [val, setVal] = useState(initial)
  const commit = () => {
    const n = parseFloat(val)
    if (!isFinite(n) || n < min || n > max) { setVal(initial); return }
    onCommit(n)
    setVal(n.toFixed(step < 0.1 ? 2 : 1))
  }
  return (
    <label className="block mt-2">
      <span className="text-gray-500 text-[11px] uppercase tracking-wider">{label}</span>
      <input
        type="number" step={step} min={min} max={max}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); setVal(initial); e.currentTarget.blur() }
        }}
        dir="ltr"
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
