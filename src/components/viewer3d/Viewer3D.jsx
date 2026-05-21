import { useRef, useState, useEffect } from 'react'
import useThree from '../../hooks/useThree'
import useWalkthrough from '../../hooks/useWalkthrough'
import useStore from '../../store/useStore'
import { getModelStatus, onCacheChange } from './furnitureModelCache'
import LightingToolbar from './LightingToolbar'
import useFurnitureDrop3D from '../../hooks/useFurnitureDrop3D'

function useAnyModelLoading() {
  const furniture = useStore((s) => s.furniture)
  const [, bump] = useState(0)
  useEffect(() => onCacheChange(() => bump((v) => v + 1)), [])
  return furniture.some((f) => f.model && getModelStatus(f.model) === 'loading')
}

export default function Viewer3D() {
  const containerRef  = useRef(null)
  const loading       = useAnyModelLoading()
  const walkthrough   = useStore((s) => s.walkthrough)
  const stateRef      = useThree(containerRef)
  const dropHandlers  = useFurnitureDrop3D(containerRef, stateRef)

  useWalkthrough(stateRef, walkthrough)

  // Track whether the pointer is currently locked
  const [ptrLocked, setPtrLocked] = useState(false)
  useEffect(() => {
    const handler = () => setPtrLocked(document.pointerLockElement != null)
    document.addEventListener('pointerlockchange', handler)
    return () => document.removeEventListener('pointerlockchange', handler)
  }, [])

  return (
    <section className="flex-1 bg-gray-950 relative overflow-hidden"
      {...dropHandlers}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Normal orbit hint — hidden during walkthrough */}
      {!walkthrough && (
        <div className="pointer-events-none absolute top-2 left-2 text-[11px] text-gray-400 font-mono bg-gray-900/80 border border-gray-700 rounded px-2 py-1">
          3D · drag to orbit · right-drag to pan · wheel to zoom
        </div>
      )}

      {/* Click-to-lock overlay — shown when walkthrough is active but pointer isn't locked */}
      {walkthrough && !ptrLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer select-none">
          <div className="text-center text-white font-mono">
            <div className="text-lg mb-1">Click to enter walkthrough</div>
            <div className="text-xs text-gray-400">Esc to exit</div>
          </div>
        </div>
      )}

      {/* Crosshair — shown only when pointer is locked */}
      {walkthrough && ptrLocked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-5 h-5">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/70 -translate-y-px" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-white/70 -translate-x-px" />
          </div>
        </div>
      )}

      {/* HUD — shown only when pointer is locked */}
      {walkthrough && ptrLocked && (
        <div className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-gray-300 font-mono bg-gray-900/80 border border-gray-700 rounded px-2 py-1">
          WASD to move · Shift to run · Space to jump · Esc to exit
        </div>
      )}

      {/* Lighting toolbar — hidden during walkthrough */}
      {!walkthrough && <LightingToolbar />}

      {loading && (
        <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1.5 text-[11px] text-gray-400 font-mono bg-gray-900/80 border border-gray-700 rounded px-2 py-1">
          <div className="w-2.5 h-2.5 rounded-full border border-gray-400 border-t-transparent animate-spin" />
          loading models…
        </div>
      )}
    </section>
  )
}
