import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import useStore from '../store/useStore'

const LAYER_DEFS = [
  { key: 'walls', label: 'Walls' },
  { key: 'furniture', label: 'Furniture' },
  { key: 'openings', label: 'Openings' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'underlay', label: 'Underlay' },
  { key: 'grid', label: 'Grid' },
]

// Collapsible layer-visibility panel shown at the bottom of the sidebar.
// Each layer can be toggled on/off; hidden layers don't render on the canvas.
export default function LayersPanel() {
  const [open, setOpen] = useState(true)
  const layers = useStore((s) => s.layers)
  const toggleLayer = useStore((s) => s.toggleLayer)

  return (
    <div className="border-t border-gray-700 shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-800 transition-colors"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Layers</span>
        <span className="text-gray-600 text-[10px]">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-0.5">
          {LAYER_DEFS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800 transition-colors text-left"
            >
              {layers[key]
                ? <Eye size={13} className="text-blue-400 shrink-0" />
                : <EyeOff size={13} className="text-gray-600 shrink-0" />}
              <span className={`text-sm ${layers[key] ? 'text-gray-300' : 'text-gray-600'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
