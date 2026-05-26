import { useTranslation } from 'react-i18next'
import { getFurnitureSpec } from './furnitureCatalog'
import { kelvinToHex } from '../../utils/colorTemp'
import { formatMeters } from './constants'

export default function LightingProps({ item, onUpdate }) {
  const { t } = useTranslation()
  const spec = getFurnitureSpec(item.type)

  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">
        {spec?.label ?? item.type}
      </h3>

      <Row label={t('lighting.id')}       value={item.id} />
      <Row label={t('lighting.position')} value={`${formatMeters(item.x)}, ${formatMeters(item.y)}`} />

      <div className="flex justify-between items-center py-1 border-b border-gray-800">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('lighting.power')}</span>
        <button
          onClick={() => onUpdate(item.id, { on: !item.on })}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
            item.on !== false
              ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
              : 'bg-gray-800 border-gray-600 text-gray-500'
          }`}
        >
          {item.on !== false ? t('lighting.on') : t('lighting.off')}
        </button>
      </div>

      <SliderRow
        label={t('lighting.intensity')}
        value={item.intensity ?? 1}
        min={0} max={3} step={0.1}
        display={(v) => v.toFixed(1)}
        onChange={(v) => onUpdate(item.id, { intensity: v })}
      />

      <div className="py-1 border-b border-gray-800">
        <div className="flex justify-between mb-1">
          <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('lighting.color_temp')}</span>
          <span className="text-gray-200 font-mono text-[12px] flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full border border-white/20"
              style={{ background: kelvinToHex(item.colorTemp ?? 3000) }}
            />
            {(item.colorTemp ?? 3000).toFixed(0)} K
          </span>
        </div>
        <input
          type="range" min={2000} max={6500} step={100}
          value={item.colorTemp ?? 3000}
          onChange={(e) => onUpdate(item.id, { colorTemp: +e.target.value })}
          className="w-full accent-yellow-400 cursor-pointer"
          dir="ltr"
        />
        <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
          <span>2000 K {t('lighting.warm')}</span><span>6500 K {t('lighting.cool')}</span>
        </div>
      </div>

      <SliderRow
        label={t('lighting.radius')}
        value={item.distance ?? 5}
        min={1} max={15} step={0.5}
        display={(v) => `${v.toFixed(1)} m`}
        onChange={(v) => onUpdate(item.id, { distance: v })}
      />

      <div className="flex justify-between items-center py-1 border-b border-gray-800">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('lighting.shadow')}</span>
        <button
          onClick={() => onUpdate(item.id, { castShadow: item.castShadow === false })}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
            item.castShadow !== false
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
              : 'bg-gray-800 border-gray-600 text-gray-500'
          }`}
        >
          {item.castShadow !== false ? t('lighting.shadow_on') : t('lighting.shadow_off')}
        </button>
      </div>

      <p className="text-[10px] text-gray-500 mt-3 leading-snug">
        {t('lighting.hint')}
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

function SliderRow({ label, value, min, max, step, display, onChange }) {
  return (
    <div className="py-1 border-b border-gray-800">
      <div className="flex justify-between mb-1">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{label}</span>
        <span className="text-gray-200 font-mono text-[12px]">{display(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-blue-400 cursor-pointer"
        dir="ltr"
      />
    </div>
  )
}
