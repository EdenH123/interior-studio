import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import useStore from '../../store/useStore'
import { TOURS, OPTIONAL_TOUR_IDS } from './tourSteps'

export default function TourMenu() {
  const { t } = useTranslation()
  const startTour    = useStore((s) => s.startTour)
  const closeTourMenu = useStore((s) => s.closeTourMenu)
  const menuRef      = useRef(null)

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) closeTourMenu()
    }
    const onKey = (e) => { if (e.key === 'Escape') closeTourMenu() }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [closeTourMenu])

  const launch = (id) => {
    startTour(id)
    closeTourMenu()
  }

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-2"
    >
      <div className="px-3 pb-2 border-b border-gray-800">
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{t('tour.ui.take_tour')}</p>
      </div>

      {/* Core tour */}
      <div className="px-2 pt-2">
        <button
          type="button"
          onClick={() => launch('core')}
          className="w-full text-left px-2 py-2 rounded hover:bg-gray-800 transition-colors group"
        >
          <div className="text-xs font-medium text-white group-hover:text-blue-400 transition-colors">
            {t('tour.core.label', { defaultValue: TOURS.core.label })}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">{t('tour.core.desc', { defaultValue: TOURS.core.description })}</div>
        </button>
      </div>

      {/* Mini-tours */}
      <div className="px-3 pt-3 pb-1">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{t('tour.ui.deep_dives')}</p>
      </div>
      <div className="px-2 pb-2">
        {OPTIONAL_TOUR_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => launch(id)}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-800 transition-colors group"
          >
            <div className="text-xs text-gray-300 group-hover:text-white transition-colors">
              {t(`tour.${id}.label`, { defaultValue: TOURS[id].label })}
            </div>
            <div className="text-[10px] text-gray-600 mt-0.5">{t(`tour.${id}.desc`, { defaultValue: TOURS[id].description })}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
