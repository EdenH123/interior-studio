import { useRef } from 'react'
import useThree from '../../hooks/useThree'

export default function Viewer3D() {
  const containerRef = useRef(null)
  useThree(containerRef)
  return (
    <section className="flex-1 bg-gray-950 border-l border-gray-700 relative overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute top-2 left-2 text-[11px] text-gray-400 font-mono bg-gray-900/80 border border-gray-700 rounded px-2 py-1">
        3D · drag to orbit · right-drag to pan · wheel to zoom
      </div>
    </section>
  )
}
