import { lazy, Suspense } from 'react'
import './index.css'
import useStore from './store/useStore'
import useLanguageSync from './hooks/useLanguageSync'
import useCanvasKeyboard from './hooks/useCanvasKeyboard'
import Toolbar from './components/Toolbar'
import Sidebar from './components/Sidebar'
import CanvasArea from './components/CanvasArea'
import PropertiesPanel from './components/PropertiesPanel'
import AiPanel from './components/AiPanel'
import Toast from './components/Toast'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import TourOverlay from './components/tour/TourOverlay'

// Viewer3D pulls in three.js (~500 kB gzipped). Lazy-load so 2D-only
// sessions never download it. See `three-scene` skill, "code-split".
const Viewer3D = lazy(() => import('./components/viewer3d/Viewer3D'))

export default function App() {
  const show3d = useStore((s) => s.show3d)
  const aiPanelOpen = useStore((s) => s.aiPanelOpen)
  const showShortcuts = useStore((s) => s.showShortcuts)
  useLanguageSync()
  // Global keyboard shortcuts live here (not in CanvasArea) so they stay
  // active in the 3D view too — CanvasArea is unmounted while show3d is on.
  useCanvasKeyboard()
  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 overflow-hidden">
          {show3d ? (
            <Suspense fallback={<ViewerFallback />}>
              <Viewer3D />
            </Suspense>
          ) : (
            <CanvasArea />
          )}
        </div>
        {aiPanelOpen ? <AiPanel /> : <PropertiesPanel />}
      </div>
      <Toast />
      {showShortcuts && <KeyboardShortcutsModal />}
      <TourOverlay />
    </div>
  )
}

function ViewerFallback() {
  return (
    <section className="flex-1 bg-gray-950 border-l border-gray-700 flex items-center justify-center">
      <span className="text-xs text-gray-500 font-mono">loading 3D…</span>
    </section>
  )
}
