import { useTranslation } from 'react-i18next'
import { formatMeters } from './constants'

const STAIR_STYLES = ['standard', 'floating', 'spiral']
const RAILING_TYPES = ['wood', 'metal', 'cable', 'glass']

export default function StairProps({ item, onUpdate }) {
  const { t } = useTranslation()
  const stairStyle  = item.stairStyle  ?? 'standard'
  const addRailing  = item.addRailing  ?? false
  const railingType = item.railingType ?? 'wood'

  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-3">{t('stair.title')}</h3>

      <div className="mb-3">
        <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1.5">{t('stair.style')}</div>
        <div className="flex gap-1 flex-wrap">
          {STAIR_STYLES.map((value) => (
            <button
              key={value}
              onClick={() => onUpdate(item.id, { stairStyle: value })}
              className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                stairStyle === value
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              {t(`stair.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 space-y-1">
        <Row label="W" value={formatMeters(item.width)} />
        <Row label="D" value={formatMeters(item.depth)} />
        <Row label="H" value={formatMeters(item.height)} />
        <Row label={t('stair.rotation')} value={`${item.rotation}°`} />
      </div>

      <div className="border-t border-gray-800 pt-3">
        <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
          <input
            type="checkbox"
            checked={addRailing}
            onChange={(e) => onUpdate(item.id, { addRailing: e.target.checked })}
            className="w-3.5 h-3.5 accent-blue-500"
          />
          <span className="text-gray-300 text-[12px] font-medium">{t('stair.add_railing')}</span>
        </label>

        {addRailing && (
          <div>
            <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1.5">{t('stair.railing_type')}</div>
            <div className="flex gap-1 flex-wrap">
              {RAILING_TYPES.map((value) => (
                <button
                  key={value}
                  onClick={() => onUpdate(item.id, { railingType: value })}
                  className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                    railingType === value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {t(`stair.${value}`)}
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
  const { t } = useTranslation()
  const hint = t(`stair.hint_${railingType}`, { defaultValue: '' })
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
