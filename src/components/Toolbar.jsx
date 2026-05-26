import { useRef } from 'react'
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

// Reads the persisted state straight from localStorage and checks whether
// the just-set underlay dataUrl made it through. The persist middleware
// uses key `interior-studio` and wraps state as `{ state, version }`.
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
  const fileRef = useRef(null)
  const { exportPng, exportPdf, exportJson, openJson, exportGlb, importInputRef, handleImportFile } = useProjectIO()
  const { canUndo, canRedo, undo, redo } = useUndoRedo()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-uploading the same file
    if (!file) return
    try {
      const raw = await readAsDataUrl(file)
      const result = await downscaleDataUrl(raw)
      setUnderlay({
        dataUrl: result.dataUrl, x: 0, y: 0, scale: 1, opacity: 0.5, locked: false,
      })
      select('underlay', UNDERLAY_ID)
      // Verify the persist write landed. Zustand's persist middleware writes
      // synchronously on set(); if localStorage rejected (QuotaExceeded), the
      // failure is swallowed there. A microtask later we can confirm by
      // reading back. If the dataUrl didn't make it, surface a hard toast so
      // the user knows the design won't survive a reload.
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

  return (
    <header className="h-11 shrink-0 bg-gray-900 border-b border-gray-700 flex items-center px-4 gap-2">
      <span className="text-white font-semibold tracking-tight">Interior Studio</span>
      <div className="ml-3 flex gap-1">
        <UndoRedoButton label="↶" title="Undo (Ctrl/Cmd+Z)" onClick={undo} disabled={!canUndo} />
        <UndoRedoButton label="↷" title="Redo (Ctrl/Cmd+Shift+Z)" onClick={redo} disabled={!canRedo} />
      </div>
      <div className="flex-1" />
      <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={handleFile} />
      <input ref={importInputRef} type="file" accept=".json,application/json" hidden onChange={handleImportFile} />
      <button type="button" onClick={openJson}
        className="text-xs font-mono px-3 py-1.5 rounded border bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500">
        Open
      </button>
      <button type="button" onClick={exportJson}
        data-tour="toolbar-save"
        className="text-xs font-mono px-3 py-1.5 rounded border bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500">
        Save
      </button>
      <button type="button" onClick={exportPng}
        className="text-xs font-mono px-3 py-1.5 rounded border bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500">
        Export PNG
      </button>
      <button type="button" onClick={exportPdf}
        className="text-xs font-mono px-3 py-1.5 rounded border bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500">
        Export PDF
      </button>
      <button type="button" onClick={exportGlb}
        title="Export 3D room as a .glb file (open 3D view first)"
        className="text-xs font-mono px-3 py-1.5 rounded border bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500">
        Export GLB
      </button>
      <button type="button" onClick={underlayClick}
        className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
          underlay ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
        }`}>
        {underlay ? (underlay.locked ? 'Underlay · locked' : 'Underlay') : 'Upload underlay'}
      </button>
      <button type="button" onClick={toggle3d} aria-pressed={show3d}
        data-tour="toolbar-3d"
        className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
          show3d ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
        }`}>
        {show3d ? '← 2D' : '3D'}
      </button>
      {show3d && (
        <button type="button" onClick={toggleWalkthrough} aria-pressed={walkthrough}
          title="Walkthrough mode — WASD to move, Shift to run, Space to jump, Esc to exit"
          data-tour="toolbar-walk"
          className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
            walkthrough ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
          }`}>
          Walk
        </button>
      )}
      <div className="relative">
        <button type="button" onClick={toggleTourMenu} aria-pressed={tourMenuOpen}
          data-tour="toolbar-help"
          title="Take a tour"
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
