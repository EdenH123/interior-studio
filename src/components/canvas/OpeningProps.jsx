import { getOpeningSpec } from './openingsCatalog'

const DOOR_COLORS = [
  { label: 'Wood',    value: '#c8a97e' },
  { label: 'White',   value: '#f0ece6' },
  { label: 'Dark',    value: '#3a3028' },
  { label: 'Black',   value: '#1a1a1a' },
  { label: 'Gray',    value: '#8a8a8a' },
]

const WINDOW_COLORS = [
  { label: 'White',   value: '#f0ece6' },
  { label: 'Wood',    value: '#c8a97e' },
  { label: 'Black',   value: '#1a1a1a' },
  { label: 'Gray',    value: '#8a8a8a' },
]

const DOOR_MATERIALS = [
  { id: 'painted', label: 'Painted' },
  { id: 'wood',    label: 'Wood Grain' },
  { id: 'glass',   label: 'Glass' },
]

export default function OpeningProps({ opening, wall, onUpdate, pushToast }) {
  const spec = getOpeningSpec(opening.type)
  const isDoor = opening.type.startsWith('door')
  const colors = isDoor ? DOOR_COLORS : WINDOW_COLORS
  const currentMaterial = opening.material ?? 'painted'

  const numberField = (label, field, step = 0.01, min = 0.05) => (
    <label className="block mt-2">
      <span className="text-gray-500 text-[11px] uppercase tracking-wider">{label}</span>
      <input
        type="number" step={step} min={min}
        value={opening[field]}
        onChange={(e) => {
          const n = parseFloat(e.target.value)
          if (!isFinite(n) || n < min) return
          const ok = onUpdate(opening.id, { [field]: n })
          if (!ok) pushToast?.(`Couldn't change ${label.toLowerCase()} — it would overlap or exceed the wall.`, 'warn')
        }}
        className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm font-mono focus:border-blue-500 focus:outline-none"
      />
    </label>
  )

  const currentColor = opening.color ?? (isDoor ? '#c8a97e' : '#f0ece6')

  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">{spec?.label ?? opening.type}</h3>
      <Row label="ID" value={opening.id} />
      <Row label="Parent wall" value={opening.wallId} />
      <Row label="Position" value={`${(opening.position * 100).toFixed(1)}% along wall`} />
      {numberField('Width (m)', 'width')}
      {numberField('Height (m)', 'height')}
      {opening.type.startsWith('window') && numberField('Sill height (m)', 'sillHeight', 0.05, 0)}

      <div className="mt-3">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">Color</span>
        <div className="flex gap-2 mt-1 flex-wrap">
          {colors.map(({ label, value }) => (
            <button
              key={value}
              title={label}
              onClick={() => onUpdate(opening.id, { color: value })}
              className="w-6 h-6 rounded border-2 transition-all"
              style={{
                backgroundColor: value,
                borderColor: currentColor === value ? '#3b82f6' : '#374151',
              }}
            />
          ))}
        </div>
      </div>

      {isDoor && (
        <div className="mt-3">
          <span className="text-gray-500 text-[11px] uppercase tracking-wider">Material</span>
          <div className="flex gap-1 mt-1">
            {DOOR_MATERIALS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onUpdate(opening.id, { material: id })}
                className={`flex-1 px-2 py-1 text-[11px] rounded border transition-all ${
                  currentMaterial === id
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-500 mt-3 leading-snug">
        Drag the opening along its wall to reposition · Del to remove.
      </p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 text-[11px] uppercase tracking-wider">{label}</span>
      <span className="text-gray-200 font-mono text-[12px] truncate ml-2">{value}</span>
    </div>
  )
}
