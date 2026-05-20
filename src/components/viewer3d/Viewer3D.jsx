import { useRef, useState, useEffect } from 'react'
import useThree from '../../hooks/useThree'
import useStore from '../../store/useStore'
import { getModelStatus, onCacheChange } from './furnitureModelCache'

function useAnyModelLoading() {
  const furniture = useStore((s) => s.furniture)
  const [, bump] = useState(0)
  useEffect(() => onCacheChange(() => bump((v) => v + 1)), [])
  return furniture.some((f) => f.model && getModelStatus(f.model) === 'loading')
}

export default function Viewer3D() {
  const containerRef = useRef(null)
  const loading = useAnyModelLoading()
  useThree(containerRef)
  return (
    <section className="flex-1 bg-gray-950 border-l border-gray-700 relative overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute top-2 left-2 text-[11px] text-gray-400 font-mono bg-gray-900/80 border border-gray-700 rounded px-2 py-1">
        3D · drag to orbit · right-drag to pan · wheel to zoom
      </div>
      {loading && (
        <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1.5 text-[11px] text-gray-400 font-mono bg-gray-900/80 border border-gray-700 rounded px-2 py-1">
          <div className="w-2.5 h-2.5 rounded-full border border-gray-400 border-t-transparent animate-spin" />
          loading models…
        </div>
      )}
    </section>
  )
}
