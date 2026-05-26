import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import useStore from '../store/useStore'

const LAYER_KEYS = ['walls', 'furniture', 'openings', 'rooms', 'underlay', 'grid']

export default function LayersPanel() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  const layers = useStore((s) => s.layers)
  const toggleLayer = useStore((s) => s.toggleLayer)

  return (
    <div className="border-t border-gray-700 shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-800 transition-colors"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t('layers.title')}</span>
        <span className="text-gray-600 text-[10px]">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-0.5">
          {LAYER_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800 transition-colors text-start"
            >
              {layers[key]
                ? <Eye size={13} className="text-blue-400 shrink-0" />
                : <EyeOff size={13} className="text-gray-600 shrink-0" />}
              <span className={`text-sm ${layers[key] ? 'text-gray-300' : 'text-gray-600'}`}>
                {t(`layers.${key}`)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
