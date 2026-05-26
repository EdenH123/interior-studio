import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import useStore from '../store/useStore'
import TourMenu from './tour/TourMenu'
import { downscaleDataUrl, QUOTA_WARN_BYTES } from './canvas/imageDownscale'
import useProjectIO from '../hooks/useProjectIO'
import useUndoRedo from '../hooks/useUndoRedo'

const UNDERLAY_ID = 'underlay'

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

function persistedUnderlayMatches(dataUrl) {
  try {
    const raw = localStorage.getItem('interior-studio')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return parsed?.state?.underlay?.dataUrl === dataUrl
  } catch {
    return false
  }
}

export default function Toolbar() {
  const { t } = useTranslation()
  const show3d = useStore((s) => s.show3d)
  const toggle3d = useStore((s) => s.toggle3d)
  const walkthrough = useStore((s) => s.walkthrough)
  const toggleWalkthrough = useStore((s) => s.toggleWalkthrough)
  const aiPanelOpen = useStore((s) => s.aiPanelOpen)
  const toggleAiPanel = useStore((s) => s.toggleAiPanel)
  const tourMenuOpen = useStore((s) => s.tourMenuOpen)
  const toggleTourMenu = useStore((s) => s.toggleTourMenu)
  const underlay = useStore((s) => s.underlay)
  const setUnderlay = useStore((s) => s.setUnderlay)
  const select = useStore((s) => s.select)
  const pushToast = useStore((s) => s.pushToast)
  const language = useStore((s) => s.language)
  const setLanguage = useStore((s) => s.setLanguage)
  const activeTool = useStore((s) => s.activeTool)
  const setActiveTool = useStore((s) => s.setActiveTool)
  const fileRef = useRef(null)
  const { exportPng, exportPdf, exportJson, openJson, exportGlb, importInputRef, handleImportFile } = useProjectIO()
  const { canUndo, canRedo, undo, redo } = useUndoRedo()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const raw = await readAsDataUrl(file)
      const result = await downscaleDataUrl(raw)
      setUnderlay({
        dataUrl: result.dataUrl, x: 0, y: 0, scale: 1, opacity: 0.5, locked: false,
      })
      select('underlay', UNDERLAY_ID)
      queueMicrotask(() => {
        if (!persistedUnderlayMatches(result.dataUrl)) {
          pushToast(
            'Underlay is too large to save in browser storage. It will work this session but be lost on reload.',
            'error',
          )
          return
        }
        if (result.dataUrl.length > QUOTA_WARN_BYTES) {
          pushToast(
            'Underlay is large; depending on browser storage limits it may not persist.',
            'warn',
          )
        } else if (result.downscaled) {
          pushToast(
            `Underlay downscaled to ${result.width}×${result.height} to fit in browser storage.`,
            'info',
          )
        }
      })
    } catch (err) {
      pushToast(err?.message ?? 'Could not read that image.', 'error')
    }
  }

  function underlayClick() {
    if (underlay) select('underlay', UNDERLAY_ID)
    else fileRef.current?.click()
  }

  const btnBase = 'text-xs font-mono px-3 py-1.5 rounded border bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'

  return (
    <header className="h-11 shrink-0 bg-gray-900 border-b border-gray-700 flex items-center px-4 gap-2">
      <span className="text-white font-semibold tracking-tight">Interior Studio</span>
      <div className="ms-3 flex gap-1">
        <UndoRedoButton label={t('toolbar.undo')} title={t('toolbar.undo_title')} onClick={undo} disabled={!canUndo} />
        <UndoRedoButton label={t('toolbar.redo')} title={t('toolbar.redo_title')} onClick={redo} disabled={!canRedo} />
      </div>
      {/* Select / Draw tool toggle */}
      <div className="ms-2 flex rounded border border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setActiveTool('select')}
          title={t('toolbar.tool_select_title')}
          className={`text-xs font-mono px-2.5 py-1.5 transition-colors ${
            activeTool === 'select'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          ↖ {t('toolbar.tool_select')}
        </button>
        <div className="w-px bg-gray-700" />
        <button
          type="button"
          onClick={() => setActiveTool('draw')}
          title={t('toolbar.tool_draw_title')}
          className={`text-xs font-mono px-2.5 py-1.5 transition-colors ${
            activeTool === 'draw'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          ✏ {t('toolbar.tool_draw')}
        </button>
      </div>
      <div className="flex-1" />
      <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={handleFile} />
      <input ref={importInputRef} type="file" accept=".json,application/json" hidden onChange={handleImportFile} />
      <button type="button" onClick={openJson} className={btnBase}>{t('toolbar.open')}</button>
      <button type="button" onClick={exportJson} data-tour="toolbar-save" className={btnBase}>{t('toolbar.save')}</button>
      <button type="button" onClick={exportPng} className={btnBase}>{t('toolbar.export_png')}</button>
      <button type="button" onClick={exportPdf} className={btnBase}>{t('toolbar.export_pdf')}</button>
      <button type="button" onClick={exportGlb} title={t('toolbar.export_glb_title')} className={btnBase}>{t('toolbar.export_glb')}</button>
      <button type="button" onClick={underlayClick}
        className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
          underlay ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
        }`}>
        {underlay ? (underlay.locked ? t('toolbar.underlay_locked') : t('toolbar.underlay')) : t('toolbar.upload_underlay')}
      </button>
      <button type="button" onClick={toggle3d} aria-pressed={show3d}
        data-tour="toolbar-3d"
        className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
          show3d ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
        }`}>
        {show3d ? t('toolbar.to_2d') : t('toolbar.to_3d')}
      </button>
      {show3d && (
        <button type="button" onClick={toggleWalkthrough} aria-pressed={walkthrough}
          title={t('toolbar.walk_title')}
          data-tour="toolbar-walk"
          className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
            walkthrough ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
          }`}>
          {t('toolbar.walk')}
        </button>
      )}
      <div className="relative">
        <button type="button" onClick={toggleTourMenu} aria-pressed={tourMenuOpen}
          data-tour="toolbar-help"
          title={t('toolbar.help_title')}
          className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
            tourMenuOpen ? 'bg-gray-700 border-gray-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
          }`}>
          ?
        </button>
        {tourMenuOpen && <TourMenu />}
      </div>
      <button type="button" onClick={toggleAiPanel} aria-pressed={aiPanelOpen}
        data-tour="toolbar-ai"
        className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
          aiPanelOpen ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
        }`}>
        AI
      </button>
      {/* Language toggle */}
      <div className="flex gap-1 ms-1">
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`text-xs font-mono px-2 py-1.5 rounded border transition-colors ${
            language === 'en' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          {t('toolbar.lang_en')}
        </button>
        <button
          type="button"
          onClick={() => setLanguage('he')}
          className={`text-xs font-mono px-2 py-1.5 rounded border transition-colors ${
            language === 'he' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          {t('toolbar.lang_he')}
        </button>
      </div>
    </header>
  )
}

function UndoRedoButton({ label, title, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className="w-7 h-7 rounded border bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed text-base leading-none">
      {label}
    </button>
  )
}
