import { useTranslation } from 'react-i18next'
import { formatMeters } from './constants'
import { getSingleItem, selectionItems } from '../../store/selectionHelpers'

// Small floating chips shown over the 2D canvas: zoom % and cursor coords
// in meters (bottom-left) and a context-sensitive hint (bottom-right).
export default function HudOverlay({ view, cursor, drawing, spaceDown, selection, calibration, shiftDown, altDown }) {
  const { t } = useTranslation()
  const single = getSingleItem(selection)
  const count = selectionItems(selection).length
  const snapModeHint = altDown
    ? t('hud.snap_free')
    : shiftDown ? t('hud.snap_90') : t('hud.snap_45')
  const hint = spaceDown
    ? t('hud.hint_pan')
    : calibration
      ? !calibration.p1
        ? t('hud.hint_calib_p1')
        : !calibration.p2
          ? t('hud.hint_calib_p2')
          : t('hud.hint_calib_distance')
      : drawing
        ? t('hud.hint_drawing', { snap: snapModeHint })
        : count > 1
          ? t('hud.hint_multi', { count })
          : single?.kind === 'furniture'
            ? t('hud.hint_furniture')
            : single?.kind === 'wall'
              ? t('hud.hint_wall')
              : single?.kind === 'opening'
                ? t('hud.hint_opening')
                : single?.kind === 'room'
                  ? t('hud.hint_room')
                  : single?.kind === 'underlay'
                    ? t('hud.hint_underlay')
                    : t('hud.hint_default')
  return (
    <div className="pointer-events-none absolute inset-0 text-[11px] text-gray-400 font-mono">
      <div className="absolute bottom-2 left-2 bg-gray-900/80 border border-gray-700 rounded px-2 py-1">
        zoom {(view.scale * 100).toFixed(0)}%
        {cursor && <> · {formatMeters(cursor.x)}, {formatMeters(cursor.y)}</>}
      </div>
      <div className="absolute bottom-2 right-2 bg-gray-900/80 border border-gray-700 rounded px-2 py-1">{hint}</div>
    </div>
  )
}
