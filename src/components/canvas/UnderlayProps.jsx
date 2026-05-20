import { useState } from 'react'
import useStore from '../../store/useStore'
import useApiKey from '../../hooks/useApiKey'
import { traceFloorPlan } from '../../services/traceFloorPlan'
import { validateProposedProject, diffProject } from '../../services/aiApply'
import { formatMeters } from './constants'

// Properties-panel editor for the floor-plan underlay: status, scale +
// origin readouts, opacity slider, calibrate / re-calibrate, remove, AI trace.
export default function UnderlayProps({ underlay, updateUnderlay, clearUnderlay, startCalibration, calibrating }) {
  const [tracing, setTracing] = useState(false)
  const pushToast    = useStore((s) => s.pushToast)
  const setAiProposal = useStore((s) => s.setAiProposal)
  const toggleAiPanel = useStore((s) => s.toggleAiPanel)
  const walls        = useStore((s) => s.walls)
  const furniture    = useStore((s) => s.furniture)
  const roomMeta     = useStore((s) => s.roomMeta)
  const [apiKey]     = useApiKey()

  const handleTrace = async () => {
    if (!apiKey) { pushToast('Set an Anthropic API key in the AI panel first.', 'warn'); return }
    if (!underlay.dataUrl) { pushToast('No image data available for tracing.', 'warn'); return }
    setTracing(true)
    try {
      const raw = await traceFloorPlan({ apiKey, underlayDataUrl: underlay.dataUrl, underlay })
      const result = validateProposedProject(raw)
      if (!result.ok) throw new Error(result.error)
      setAiProposal({
        proposed: result.data,
        diff: diffProject({ walls, furniture, roomMeta }, result.data),
      })
      toggleAiPanel()
      pushToast(`Traced ${result.data.walls.length} wall segments. Review in AI panel.`, 'info')
    } catch (err) {
      pushToast(`Trace failed: ${err.message}`, 'error')
    } finally {
      setTracing(false)
    }
  }

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
      <button type="button" onClick={handleTrace} disabled={tracing || !apiKey}
        className="mt-2 w-full text-xs px-2 py-1 rounded bg-violet-700 border border-violet-600 text-white hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed">
        {tracing ? 'Tracing…' : 'AI: Trace floor plan'}
      </button>
      {!apiKey && (
        <p className="text-[10px] text-amber-500 mt-1">Requires an API key (set in AI panel).</p>
      )}
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
