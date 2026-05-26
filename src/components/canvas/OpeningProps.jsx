import { useTranslation } from 'react-i18next'
import { getOpeningSpec } from './openingsCatalog'

const DOOR_COLORS = [
  { label: 'color_wood',  value: '#c8a97e' },
  { label: 'color_white', value: '#f0ece6' },
  { label: 'color_dark',  value: '#3a3028' },
  { label: 'color_black', value: '#1a1a1a' },
  { label: 'color_gray',  value: '#8a8a8a' },
]

const WINDOW_COLORS = [
  { label: 'color_white', value: '#f0ece6' },
  { label: 'color_wood',  value: '#c8a97e' },
  { label: 'color_black', value: '#1a1a1a' },
  { label: 'color_gray',  value: '#8a8a8a' },
]

const DOOR_MATERIALS = [
  { id: 'painted', labelKey: 'mat_painted' },
  { id: 'wood',    labelKey: 'mat_wood_grain' },
  { id: 'glass',   labelKey: 'mat_glass' },
]

const WINDOW_FRAME_MATERIALS = [
  { id: 'painted',  labelKey: 'mat_painted' },
  { id: 'aluminum', labelKey: 'mat_aluminum' },
  { id: 'wood',     labelKey: 'mat_wood' },
]

export default function OpeningProps({ opening, wall, onUpdate, pushToast }) {
  const { t } = useTranslation()
  const spec = getOpeningSpec(opening.type)
  const isDoor = opening.type.startsWith('door')
  const isWindow = opening.type.startsWith('window')
  const colors = isDoor ? DOOR_COLORS : WINDOW_COLORS
  const currentMaterial = opening.material ?? 'painted'

  const numberField = (labelKey, field, step = 0.01, min = 0.05) => (
    <label className="block mt-2">
      <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t(`opening.${labelKey}`)}</span>
      <input
        type="number" step={step} min={min}
        value={opening[field]}
        onChange={(e) => {
          const n = parseFloat(e.target.value)
          if (!isFinite(n) || n < min) return
          const ok = onUpdate(opening.id, { [field]: n })
          if (!ok) pushToast?.(`Couldn't change ${t(`opening.${labelKey}`).toLowerCase()} — it would overlap or exceed the wall.`, 'warn')
        }}
        dir="ltr"
        className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm font-mono focus:border-blue-500 focus:outline-none"
      />
    </label>
  )

  const currentColor = opening.color ?? (isDoor ? '#c8a97e' : '#f0ece6')

  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">{spec?.label ?? opening.type}</h3>
      <Row label={t('opening.id')} value={opening.id} />
      <Row label={t('opening.parent_wall')} value={opening.wallId} />
      <Row label={t('opening.position')} value={t('opening.position_value', { pct: (opening.position * 100).toFixed(1) })} />
      {numberField('width', 'width')}
      {numberField('height', 'height')}
      {opening.type.startsWith('window') && numberField('sill_height', 'sillHeight', 0.05, 0)}

      <div className="mt-3">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('opening.color')}</span>
        <div className="flex gap-2 mt-1 flex-wrap">
          {colors.map(({ label, value }) => (
            <button
              key={value}
              title={t(`opening.${label}`)}
              onClick={() => onUpdate(opening.id, { color: value })}
              className="w-6 h-6 rounded border-2 transition-all"
              style={{
                backgroundColor: value,
                borderColor: currentColor === value ? '#3b82f6' : '#374151',
              }}
            />
          ))}
        </div>
      </div>

      {isDoor && (
        <div className="mt-3">
          <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('opening.material')}</span>
          <div className="flex gap-1 mt-1">
            {DOOR_MATERIALS.map(({ id, labelKey }) => (
              <button
                key={id}
                onClick={() => onUpdate(opening.id, { material: id })}
                className={`flex-1 px-2 py-1 text-[11px] rounded border transition-all ${
                  currentMaterial === id
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                {t(`opening.${labelKey}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {isWindow && (
        <div className="mt-3">
          <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('opening.frame')}</span>
          <div className="flex gap-1 mt-1">
            {WINDOW_FRAME_MATERIALS.map(({ id, labelKey }) => (
              <button
                key={id}
                onClick={() => onUpdate(opening.id, { material: id })}
                className={`flex-1 px-2 py-1 text-[11px] rounded border transition-all ${
                  currentMaterial === id
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                {t(`opening.${labelKey}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {(opening.type === 'door' || opening.type === 'door-sliding') && (
        <div className="mt-3">
          <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('opening.swing')}</span>
          <div className="flex gap-1 mt-1">
            {[{ id: 'left', labelKey: 'left' }, { id: 'right', labelKey: 'right' }].map(({ id, labelKey }) => (
              <button
                key={id}
                onClick={() => onUpdate(opening.id, { swingDir: id })}
                className={`flex-1 px-2 py-1 text-[11px] rounded border transition-all ${
                  (opening.swingDir ?? 'left') === id
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                {t(`opening.${labelKey}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {(opening.type === 'door' || opening.type === 'door-double') && (
        <div className="mt-3">
          <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('opening.opens_toward')}</span>
          <div className="flex gap-1 mt-1">
            {[{ id: 'front', labelKey: 'front' }, { id: 'back', labelKey: 'back' }].map(({ id, labelKey }) => (
              <button
                key={id}
                onClick={() => onUpdate(opening.id, { openSide: id })}
                className={`flex-1 px-2 py-1 text-[11px] rounded border transition-all ${
                  (opening.openSide ?? 'front') === id
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                {t(`opening.${labelKey}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-500 mt-3 leading-snug">
        {t('opening.drag_hint')}
      </p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 text-[11px] uppercase tracking-wider">{label}</span>
      <span className="text-gray-200 font-mono text-[12px] truncate ms-2">{value}</span>
    </div>
  )
}
