import { useEffect, useRef, useState } from 'react'
import { pixelDistanceMeters } from './CalibrationOverlay'

// Centred floating prompt that appears once both calibration points are
// placed. Asks the user how far apart those two points are in the real
// world; on confirm, hands the value back to the store via onConfirm.
// Autofocuses the input; Enter submits, Esc cancels.
export default function CalibrationPrompt({ p1, p2, onConfirm, onCancel }) {
  const [value, setValue] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])

  const submit = () => {
    const n = parseFloat(value)
    if (!isFinite(n) || n <= 0) return
    onConfirm(n)
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-gray-900 border border-gray-700 rounded-md shadow-lg p-4 min-w-[260px] text-sm">
        <h3 className="text-gray-100 text-sm font-semibold mb-1">Calibrate underlay</h3>
        <p className="text-gray-400 text-[11px] mb-3 leading-snug">
          Two points marked. Enter their real-world distance to scale the
          image so the canvas grid stays accurate.
        </p>
        <p className="text-gray-500 text-[11px] font-mono mb-3">
          current pixel distance ≈ {pixelDistanceMeters(p1, p2).toFixed(2)} m at the canvas scale
        </p>
        <label className="block">
          <span className="text-gray-400 text-[10px] uppercase tracking-wider">Real distance (meters)</span>
          <input
            ref={ref}
            type="number" step="0.01" min="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); submit() }
              if (e.key === 'Escape') { e.preventDefault(); onCancel?.() }
            }}
            placeholder="3.20"
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:border-blue-500 focus:outline-none font-mono"
          />
        </label>
        <div className="flex gap-2 mt-3 justify-end">
          <button type="button" onClick={onCancel}
            className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-500">
            Cancel
          </button>
          <button type="button" onClick={submit}
            className="text-xs px-2 py-1 rounded bg-blue-600 border border-blue-500 text-white hover:bg-blue-500">
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
