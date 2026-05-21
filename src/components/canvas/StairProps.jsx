import { formatMeters } from './constants'

const STAIR_STYLES = [
  { value: 'standard', label: 'Standard' },
  { value: 'floating', label: 'Floating' },
  { value: 'spiral',   label: 'Spiral'   },
]

const RAILING_TYPES = [
  { value: 'wood',  label: 'Wood'  },
  { value: 'metal', label: 'Metal' },
  { value: 'cable', label: 'Cable' },
  { value: 'glass', label: 'Glass' },
]

// Properties-panel editor for stair furniture items.
// Shows stair style selector, add-railing checkbox, and railing type picker.
export default function StairProps({ item, onUpdate }) {
  const stairStyle  = item.stairStyle  ?? 'standard'
  const addRailing  = item.addRailing  ?? false
  const railingType = item.railingType ?? 'wood'

  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-3">Stairs</h3>

      {/* Stair style */}
      <div className="mb-3">
        <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1.5">Style</div>
        <div className="flex gap-1 flex-wrap">
          {STAIR_STYLES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onUpdate(item.id, { stairStyle: value })}
              className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                stairStyle === value
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Dimensions (read-only summary) */}
      <div className="mb-3 space-y-1">
        <Row label="W" value={formatMeters(item.width)} />
        <Row label="D" value={formatMeters(item.depth)} />
        <Row label="H" value={formatMeters(item.height)} />
        <Row label="Rotation" value={`${item.rotation}°`} />
      </div>

      {/* Railing section */}
      <div className="border-t border-gray-800 pt-3">
        <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
          <input
            type="checkbox"
            checked={addRailing}
            onChange={(e) => onUpdate(item.id, { addRailing: e.target.checked })}
            className="w-3.5 h-3.5 accent-blue-500"
          />
          <span className="text-gray-300 text-[12px] font-medium">Add railing</span>
        </label>

        {addRailing && (
          <div>
            <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1.5">Railing type</div>
            <div className="flex gap-1 flex-wrap">
              {RAILING_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onUpdate(item.id, { railingType: value })}
                  className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                    railingType === value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <RailingHint railingType={railingType} />
          </div>
        )}
      </div>
    </div>
  )
}

function RailingHint({ railingType }) {
  const hints = {
    wood:  'Chunky balusters + flat handrail',
    metal: 'Thin posts + diagonal mid-rail',
    cable: 'Posts + 5 parallel diagonal cables',
    glass: 'Vertical glass panels + metal cap',
  }
  const hint = hints[railingType]
  if (!hint) return null
  return <p className="text-gray-600 text-[10px] mt-1.5 leading-snug">{hint}</p>
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-gray-500 text-[11px] uppercase tracking-wider">{label}</span>
      <span className="text-gray-300 font-mono text-[11px]">{value}</span>
    </div>
  )
}
