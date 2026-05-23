import { getOpeningSpec } from './openingsCatalog'

// Editor for a selected opening. Width / height / sill height are
// editable as plain meters. The store's `updateOpening` re-clamps + re-
// checks overlap on every update; rejected patches return false so the
// caller can toast (we don't here — the visual stays at the old value
// which is feedback enough for typed edits).
export default function OpeningProps({ opening, wall, onUpdate, pushToast }) {
  const spec = getOpeningSpec(opening.type)
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

  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">{spec?.label ?? opening.type}</h3>
      <Row label="ID" value={opening.id} />
      <Row label="Parent wall" value={opening.wallId} />
      <Row label="Position" value={`${(opening.position * 100).toFixed(1)}% along wall`} />
      {numberField('Width (m)', 'width')}
      {numberField('Height (m)', 'height')}
      {opening.type.startsWith('window') && numberField('Sill height (m)', 'sillHeight', 0.05, 0)}
      <p className="text-[10px] text-gray-500 mt-3 leading-snug">
        Drag the opening along its wall to reposition · Del to remove. The opening always stays inside the wall and won't overlap with others.
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
