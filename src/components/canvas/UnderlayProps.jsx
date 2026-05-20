import { formatMeters } from './constants'

// Properties-panel editor for the floor-plan underlay: status, scale +
// origin readouts, opacity slider, calibrate / re-calibrate, remove.
// Kept in its own file because PropertiesPanel was accumulating one
// section per selectable kind.
export default function UnderlayProps({ underlay, updateUnderlay, clearUnderlay, startCalibration, calibrating }) {
  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">Underlay</h3>
      <Row label="Status" value={underlay.locked ? 'locked' : 'unlocked'} />
      <Row label="Scale" value={`${underlay.scale.toFixed(3)} px/px`} />
      <Row label="Origin" value={`${formatMeters(underlay.x)}, ${formatMeters(underlay.y)}`} />
      <label className="block mt-3">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">
          Opacity · {(underlay.opacity * 100).toFixed(0)}%
        </span>
        <input
          type="range" min="0.05" max="1" step="0.01"
          value={underlay.opacity}
          onChange={(e) => updateUnderlay({ opacity: parseFloat(e.target.value) })}
          className="mt-1 w-full accent-blue-500"
        />
      </label>
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={startCalibration} disabled={calibrating}
          className="flex-1 text-xs px-2 py-1 rounded bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
          {calibrating ? 'Calibrating…' : underlay.locked ? 'Re-calibrate' : 'Calibrate'}
        </button>
        <button type="button" onClick={clearUnderlay}
          className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:border-red-500 hover:text-red-300">
          Remove
        </button>
      </div>
      <p className="text-[10px] text-gray-500 mt-3 leading-snug">
        Calibrate by clicking two points whose real-world distance you know.
        After calibrating, the image locks so drawing walls on top of it
        doesn't shift the image.
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
