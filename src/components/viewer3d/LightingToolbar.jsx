import { useTranslation } from 'react-i18next'
import useStore from '../../store/useStore'

function formatTime(t) {
  const h = Math.floor(t)
  const m = Math.round((t - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function LightingToolbar() {
  const { t } = useTranslation()
  const lightsOn         = useStore((s) => s.lighting.lightsOn)
  const timeOfDay        = useStore((s) => s.lighting.timeOfDay)
  const ambientStrength  = useStore((s) => s.lighting.ambientStrength)
  const setLightsOn      = useStore((s) => s.setLightsOn)
  const setTimeOfDay     = useStore((s) => s.setTimeOfDay)
  const setAmbientStrength = useStore((s) => s.setAmbientStrength)
  const solo3d          = useStore((s) => s.solo3d)
  const xrayCeiling     = useStore((s) => s.xrayCeiling)
  const ceilingsVisible = useStore((s) => s.ceilingsVisible)
  const setSolo3d          = useStore((s) => s.setSolo3d)
  const setXrayCeiling     = useStore((s) => s.setXrayCeiling)
  const setCeilingsVisible = useStore((s) => s.setCeilingsVisible)

  return (
    <div data-tour="lighting-toolbar" className="pointer-events-auto absolute top-2 right-2 w-44 bg-gray-900/90 border border-gray-700 rounded p-2.5 space-y-2.5 text-[11px] text-gray-300 font-mono select-none">

      <div className="flex items-center justify-between gap-1">
        <button
          onClick={() => setSolo3d(!solo3d)}
          className={`flex-1 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
            solo3d
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
              : 'bg-gray-800 border-gray-600 text-gray-500'
          }`}
          title={t('lighting_toolbar.solo_title')}
        >
          {t('lighting_toolbar.solo')}
        </button>
        <button
          onClick={() => setXrayCeiling(!xrayCeiling)}
          className={`flex-1 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
            xrayCeiling
              ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
              : 'bg-gray-800 border-gray-600 text-gray-500'
          }`}
          title={t('lighting_toolbar.xray_title')}
        >
          {t('lighting_toolbar.xray')}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="uppercase tracking-wider text-gray-400">{t('lighting_toolbar.ceilings')}</span>
        <button
          onClick={() => setCeilingsVisible(!ceilingsVisible)}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
            ceilingsVisible
              ? 'bg-gray-500/20 border-gray-500/50 text-gray-300'
              : 'bg-gray-800 border-gray-600 text-gray-500'
          }`}
          title={t('lighting_toolbar.ceilings_title')}
        >
          {ceilingsVisible ? t('lighting_toolbar.on') : t('lighting_toolbar.off')}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="uppercase tracking-wider text-gray-400">{t('lighting_toolbar.lights')}</span>
        <button
          onClick={() => setLightsOn(!lightsOn)}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
            lightsOn
              ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
              : 'bg-gray-800 border-gray-600 text-gray-500'
          }`}
        >
          {lightsOn ? t('lighting_toolbar.on') : t('lighting_toolbar.off')}
        </button>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span className="uppercase tracking-wider text-gray-400">{t('lighting_toolbar.time')}</span>
          <span>{formatTime(timeOfDay)}</span>
        </div>
        <input
          type="range" min={0} max={24} step={0.25}
          value={timeOfDay}
          onChange={(e) => setTimeOfDay(+e.target.value)}
          className="w-full accent-yellow-400 cursor-pointer"
          dir="ltr"
        />
        <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
          <span>00:00</span><span>{t('lighting_toolbar.noon')}</span><span>24:00</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span className="uppercase tracking-wider text-gray-400">{t('lighting_toolbar.ambient')}</span>
          <span>{(ambientStrength * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.05}
          value={ambientStrength}
          onChange={(e) => setAmbientStrength(+e.target.value)}
          className="w-full accent-blue-400 cursor-pointer"
          dir="ltr"
        />
      </div>
    </div>
  )
}
